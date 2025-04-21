import React, { useState, useEffect } from 'react';
import secureLocalStorage from 'react-secure-storage';
import GameAccountDashboard from './GameDashboard';
import { ViewState } from "../../../types/viewState";
import './Styles/Main.scss';

interface AppProps {
    ViewState: ViewState
}


type GameType = 'genshin' | 'starrail' | 'zenless';

const HoyoMain: React.FC<AppProps> = ({ ViewState }) => {
    const [gameData, setGameData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const performLogin = async () => {
            try {
                const username = secureLocalStorage.getItem('hoyolab_username') as string;
                const password = secureLocalStorage.getItem('hoyolab_password') as string;

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

                await window.hoyoAPI.initialize(cookieString, uid);

                console.log(await window.hoyoAPI.callMethod('genshin.getInfo', ''))
                

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