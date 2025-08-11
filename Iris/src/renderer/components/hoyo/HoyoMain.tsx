import React, { useState, useEffect } from 'react';
import GameAccountDashboard from './GameDashboard.tsx';
import { ViewState } from "../../../types/viewState.ts";
import './Styles/Main.scss';

interface AppProps {
    ViewState: ViewState
}


type GameType = 'genshin' | 'starrail' | 'zenless';

const HoyoMain: React.FC<AppProps> = ({ ViewState }) => {

    useEffect(() => {
        const performLogin = async () => {
            try {
                if (!window.dev.hoyo.online) {
                    return console.warn('Hoyolab online mode is disabled. Please enable it in the dev settings.');
                }

                if (window.settings.get('hoyolab.cookie') && window.settings.get('hoyolab.uid')) {
                    const cookie = window.settings.get('hoyolab.cookie');
                    const uid = window.settings.get('hoyolab.uid');

                    if (!cookie || !uid) {
                        throw new Error('Cookie or UID not found in storage, but you somehow have them set (WTF)');
                    }

                    await window.hoyoAPI.initialize(cookie, uid);
                    console.log('HoyoAPI initialized with existing cookie and UID');                    
                } else {
                    const username = window.settings.get('hoyolab.username');
                    const password = window.settings.get('hoyolab.password');

                    if (!username || !password) {
                        throw new Error('Username or password not found in storage');
                    }

                    const result = await window.hoyoAPI.login(username, password);
                    console.log('Login successful:', result);

                    const cookieString = [
                        `cookie_token_v2=${result.cookies.cookie_token_v2}`,
                        `account_mid_v2=${result.cookies.account_mid_v2}`,
                        `account_id_v2=${result.cookies.account_id_v2}`,
                        `ltoken_v2=${result.cookies.ltoken_v2}`,
                        `ltmid_v2=${result.cookies.ltmid_v2}`,
                        `ltuid_v2=${result.cookies.ltuid_v2}`,
                    ].join('; ');

                    var uid = result.uid
                    window.settings.set('hoyolab.cookie', cookieString);
                    window.settings.set('hoyolab.uid', uid);

                    await window.hoyoAPI.initialize(cookieString, uid);

                    console.log(await window.hoyoAPI.callMethod('genshin.getInfo', ''))
                }



            } catch (err) {
                console.error('Login failed:', err);
            }
        };

        performLogin();
    }, []);


    return (
        <div>
            <GameAccountDashboard
                viewState={ViewState}
            />
            {/* <div className="background" color='white'/> */}
        </div>
    );
};

export default HoyoMain;