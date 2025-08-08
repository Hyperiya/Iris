import React, { useState, useEffect } from 'react';
import Titlebar from './components/Titlebar.tsx';
import Settings, { DEFAULT_MODULES } from './components/Settings.tsx';
import { DEFAULT_SETTINGS, AppSettings, EnabledModules } from '../utils/settingsUtil.ts';
import '../index.scss';
import { ViewState } from '../types/viewState.ts';
import SpotifyMain from './components/spotify/SpotifyMain.tsx';
import HoyoMain from './components/hoyo/HoyoMain.tsx';
import DiscordMain from './components/discord/DiscordMain.tsx';
import AppSelector from './components/AppSelector.tsx';
import SpeechRecognitionService from '../services/micServices/speech.ts';

import { LoadingProvider, useLoading } from './context/LoadingContext.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';


interface AppProps {
}



function AppContent() {
  const [isSettings, setIsSettings] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [enabledModules, setEnabledModules] = useState<EnabledModules>(() => {
    const savedModules = window.settings.get('ui.modules');
    return savedModules;
  });

  const [viewState, setViewState] = useState<ViewState>(() => {
    if (!enabledModules.hoyolab) {
      return ViewState.SPOTIFY_FULL;
    } else if (!enabledModules.spotify) {
      return ViewState.RIGHT_FULL;
    }
    return ViewState.NEUTRAL;
  });

  const [hide, setHide] = useState<boolean>(() => {
    if (!enabledModules.hoyolab || !enabledModules.spotify) {
      return true;
    }
    return false;
  });

  const [sensitivity, setSensitivity] = useState<number>(() =>
    Number(window.settings.get('audio.sensitivity')) || 50
  );

  const [activeDevice, setActiveDevice] = useState<string>(() =>
    String(window.settings.get('audio.device')) || ''
  );

  const [isIrisEnabled, setIsIrisEnabled] = useState<boolean>(() =>
    Boolean(window.settings.get('audio.enabled')) || false
  );

  const [irisStarted, setIrisStarted] = useState<boolean>(false)

  const { isLoading, progress, message } = useLoading();

  const speechService = SpeechRecognitionService;

  useEffect(() => {
    const loadSettings = async () => {
      const savedModules = await window.settings.get('ui.modules');
      setEnabledModules(savedModules);
    };
    loadSettings();
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
    const handleSettingsChange = (key: string, value: any) => {
      if (key === 'audio.sensitivity') {
        setSensitivity(Number(value) || 50);
      }
      if (key === 'audio.selectedDevice') {
        setActiveDevice(value || '');
      }
      if (key === 'audio.irisEnabled') {
        setIsIrisEnabled(Boolean(value));
      }
    };

    // Listen for settings changes
    window.settings.onChange(handleSettingsChange);

    return () => {
      // Cleanup
      window.settings.removeChangeListener();
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

          {enabledModules.discord && (
            <DiscordMain />
          )}

          {enabledModules.spotify && (
            <div className={`spotify-section ${viewState === ViewState.SPOTIFY_FULL ? 'full' : ''}`}>
              <SpotifyMain ViewState={viewState} />
            </div>
          )}
          {enabledModules.hoyolab && (
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