import React, { useState, useEffect, use } from 'react';
import Titlebar from './components/Titlebar.tsx';
import Settings, { EnabledModules, DEFAULT_MODULES } from './components/Settings.tsx';
import '../index.scss';
import { ViewState } from '../types/viewState.ts';
import SpotifyMain from './components/spotify/SpotifyMain.tsx';
import HoyoMain from './components/hoyo/HoyoMain.tsx';
import DiscordMain from './components/discord/DiscordMain.tsx';
import AppSelector from './components/AppSelector.tsx';
import secureLocalStorage from 'react-secure-storage';
import SpeechRecognitionService from '../services/micServices/speech.ts';

import { LoadingProvider, useLoading } from './context/LoadingContext.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';


interface AppProps {
}



function AppContent() {
  const [isSettings, setIsSettings] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [enabledModules, setEnabledModules] = useState<EnabledModules>(() => {
    const savedModules = secureLocalStorage.getItem('enabled_modules');
    if (savedModules) {
      return JSON.parse(savedModules as string) as EnabledModules;
    }
    return DEFAULT_MODULES;
  });

  const [viewState, setViewState] = useState<ViewState>(() => {
    if (!enabledModules.Hoyolab) {
      return ViewState.SPOTIFY_FULL;
    } else if (!enabledModules.Spotify) {
      return ViewState.RIGHT_FULL;
    }
    return ViewState.NEUTRAL;
  });

  const [hide, setHide] = useState<boolean>(() => {
    if (!enabledModules.Hoyolab || !enabledModules.Spotify) {
      return true;
    }
    return false;
  });

  const [sensitivity, setSensitivity] = useState<number>(() =>
    Number(localStorage.getItem('sensitivity-value')) || 50
  );

  const [activeDevice, setActiveDevice] = useState<string>(() =>
    localStorage.getItem('selected-device') || ''
  );

  const [isIrisEnabled, setIsIrisEnabled] = useState<boolean>(() => {
    return localStorage.getItem('iris-enabled') === 'true' || false;
  })
  const [irisStarted, setIrisStarted] = useState<boolean>(false)

  const { isLoading, progress, message } = useLoading();

  const speechService = SpeechRecognitionService;

  useEffect(() => {
    const savedModules = secureLocalStorage.getItem('enabled_modules');
    console.log(savedModules)
    if (savedModules) {
      setEnabledModules(JSON.parse(savedModules as string));
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = !!document.fullscreenElement;
      window.electron.window.isFullScreen().then((isElectronFullscreen: boolean) => {
        setIsFullScreen(isDocFullscreen || isElectronFullscreen);
      });
    };

    window.electron.window.onFullScreen(handleFullscreenChange);

    // Initial check
    handleFullscreenChange();

    return () => {
      window.electron.window.removeFullScreenListener();
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sensitivity-value') {
        setSensitivity(Number(e.newValue) || 50);
      }
      if (e.key === 'selected-device') {
        setActiveDevice(e.newValue || '');
      }
      if (e.key === 'iris-enabled') {
        setIsIrisEnabled(e.newValue === 'true' || false);
      }
      console.log('storage event')
    };


    // For changes from other windows/tabs
    window.addEventListener('storage', handleStorageChange);

    // For changes within the same window
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key: string, value: string) {
      const event = new Event('localStorageChange');
      (event as any).key = key;
      (event as any).newValue = value;
      window.dispatchEvent(event);
      originalSetItem.apply(this, [key, value]);
    };

    const handleLocalChange = (e: Event) => {
      const key = (e as any).key;
      const newValue = (e as any).newValue;
      console.log(key, newValue)

      if (key === 'sensitivity-value') {
        setSensitivity(Number(newValue) || 50);
      }
      if (key === 'selected-device') {
        setActiveDevice(newValue || '');
      }
      if (key === 'iris-enabled') {
        setIsIrisEnabled(newValue === 'true' || false);
      }
    };

    window.addEventListener('localStorageChange', handleLocalChange);

    return () => {
      // Cleanup
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleLocalChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  useEffect(() => {
    // Initialize the service
    if (isIrisEnabled) {
      console.log('isIrisEnabled', isIrisEnabled)
      speechService.initialize()
    };

    return () => {
      speechService.cleanup();
    };
  }, []);

  useEffect(() => {
    console.log('Sens, Activedevice changed')
    if (isIrisEnabled) {
      if (irisStarted) speechService.stopListening();
      speechService.startListening(sensitivity, activeDevice);
    }
  }, [sensitivity, activeDevice])

  useEffect(() => {
    if (isIrisEnabled === true) {
      speechService.initialize()
      speechService.startListening(sensitivity, activeDevice);
      setIrisStarted(true)
    } else {
      if (irisStarted) {
        speechService.cleanup();
        setIrisStarted(false)
      };
    }
  }, [isIrisEnabled])

  // useEffect(() => {
  //   window.electron.window.toggleClickThrough(true);
  // }, [])

  const handleOutsideClick = (e: React.MouseEvent) => {
    // Only close if clicking the container itself, not its children
    if (e.target === e.currentTarget) {
      setIsSettings(false);
    }
  };

  return (
    <>
      <LoadingScreen
        isVisible={isLoading}
        progress={progress}
        message={message}
      />
      <div
        className={`App ${isFullScreen ? 'fullscreen' : ''}`}
        onClick={isSettings ? handleOutsideClick : undefined}
      >
        <Titlebar
          isSettings={isSettings}
          setIsSettings={setIsSettings}
        />

        <div className={`content-wrapper ${viewState}`}>
          <AppSelector
            viewState={viewState}
            setViewState={setViewState}
            hide={hide}
          />
          {isSettings && (
            <div
              className="settings-backdrop"
              onClick={handleOutsideClick}
            >
              <Settings isSettings={isSettings} setIsSettings={setIsSettings} />
            </div>
          )}

          {enabledModules.Discord && (
            <DiscordMain />
          )}

          {enabledModules.Spotify && (
            <div className={`spotify-section ${viewState === ViewState.SPOTIFY_FULL ? 'full' : ''}`}>
              <SpotifyMain ViewState={viewState} />
            </div>
          )}
          {enabledModules.Hoyolab && (
            <div className={`right-section ${viewState === ViewState.RIGHT_FULL ? 'full' : viewState === ViewState.SPOTIFY_FULL ? 'hidden' : ''}`}>
              <HoyoMain ViewState={viewState} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export function App({ }: AppProps) {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}

export default App;