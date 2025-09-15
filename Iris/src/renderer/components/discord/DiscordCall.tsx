// TODO: 
// Collapse button on popup 
// Add timeout to updating call data when leaving 
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles/DiscordCall.scss';

import { MicOffRounded, HeadsetRounded, HeadsetOffRounded, PhoneDisabledRounded, PhoneRounded, CloseRounded, MicRounded } from '@mui/icons-material';

import { DiscordNotificationType } from './../../../services/discordServices/types.ts';

import { GetChannelType } from './../../../services/discordServices/eventTypes/GetChannelType.ts'
import { SpeakingType } from './../../../services/discordServices/eventTypes/SpeakingType.ts';
import { VoiceStateType } from './../../../services/discordServices/eventTypes/VoiceStateType.ts';
import { VoiceSettingsType } from './../../../services/discordServices/eventTypes/VoiceSettingsType.ts';
import { logger } from '../../utils/logger.ts'

interface VoiceUsers {
    [key: string]: {
        uid: string;
        speaking: boolean;
        profile: string;
        nickname: string;
        muted: boolean;
        deafened: boolean;
        selfmuted: boolean;
        selfdeafened: boolean;
    }
}


// DiscordCall.tsx
const DiscordCall: React.FC = () => {
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [isInCall, setIsInCall] = useState(false);
    const [callState, setCallState] = useState<VoiceUsers | null>(null)
    const [isBeingCalled, setIsBeingCalled] = useState<boolean>(false)
    const [channelId, setChannelId] = useState<number>(0)
    const [beingCalledData, setBeingCalledData] = useState<DiscordNotificationType>()

    const beingCalledDataRef = useRef<DiscordNotificationType | undefined>(undefined);
    const isBeingCalledRef = useRef(false);

    useEffect(() => {
        isBeingCalledRef.current = isBeingCalled;
    }, [isBeingCalled]);

    useEffect(() => {
        beingCalledDataRef.current = beingCalledData;
    }, [beingCalledData]);

    // Handling cases where the user doesn't accept nor decline the call
    useEffect(() => {
        if (isBeingCalledRef.current) {
            const timeoutId = setTimeout(() => {
                setIsBeingCalled(false);
            }, 30000);

            return () => clearTimeout(timeoutId);
        }
    }, [isInCall, isBeingCalledRef.current])

    useEffect(() => {
        try {

            const handleData = (data: any) => {
                handleDiscordData(data);
            };

            window.discord.onData(handleData);

            const timer = setTimeout(() => {
                window.discord.voice.getVoiceChannel();
                window.discord.voice.getVoiceSettings();
            }, 2000);

            return () => {
                clearTimeout(timer);
                window.discord.removeDataListener(); // Remove specific listener
            }
        } catch (error) {
            window.discord.removeDataListener();
            throw new Error(error)
        }
    }, []);


    const handleMute = () => {
        if (isDeafened) {
            setIsDeafened(false);
            window.discord.voice.undeafen();
            return;
        }
        if (!isMuted) window.discord.voice.mute();
        else window.discord.voice.unmute();

        setIsMuted(!isMuted)
    }
    const handleDeafen = () => {
        if (!isDeafened) window.discord.voice.deafen();
        else window.discord.voice.undeafen();

        setIsDeafened(!isDeafened)
        setIsMuted(!isMuted)
    }

    const handleLeave = () => {
        window.discord.voice.leave();
        setCallState(null)


        setIsInCall(false)
    }

    const handleJoin = () => {
        if (!isInCall) {
            window.discord.voice.join(channelId.toString());
        };
        setIsInCall(true);
    }



    const handleDiscordData = useCallback(async (data: any) => {
        const setInitial = (initialData: GetChannelType) => {
            if (!initialData) return;
            // window.electron.log('setting initial')
            const voiceUsers = initialData?.data?.voice_states?.reduce((acc, state) => {
                acc[state.user.id] = {
                    uid: state.user.id,
                    speaking: false,
                    profile: `https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}?size=1024`, // Set your default value
                    nickname: state.nick,
                    muted: state.voice_state.mute,
                    deafened: state.voice_state.deaf,
                    selfmuted: state.voice_state.self_mute,
                    selfdeafened: state.voice_state.self_deaf
                };
                return acc;
            }, {} as VoiceUsers);


            if (!initialData?.data?.voice_states) {
                setIsInCall(false)
                return;
            } else {
                logger.log(initialData?.data?.voice_states?.length)
                setIsInCall(true)
            }


            setCallState(voiceUsers)
            logger.log(voiceUsers)

        }

        switch (data.evt ?? data.cmd) {
            case 'VOICE_CHANNEL_SELECT':
                if (!data.data.channel_id) {
                    setCallState(null);
                    setIsInCall(false)
                    break;
                }
                logger.log('Channel ID', data.data.channel_id)
                logger.log(isBeingCalledRef.current)

                if (isBeingCalledRef.current && beingCalledDataRef.current?.data.channel_id === data.data.channel_id) {
                    setIsBeingCalled(false);
                    logger.log('isbeingcalled false');
                } else {
                    logger.log('isbeingcalled true');
                    // Don't throw an error, just log it
                    logger.log(`Conditions not met: isBeingCalled=${isBeingCalledRef.current}, channelId=${beingCalledDataRef.current?.data.channel_id}, dataChannelId=${data.data.channel_id}`);
                }

                setIsInCall(true);
                logger.log('getting channel')
                window.discord.voice.getVoiceChannel();
                logger.log('getting voicesettings')
                window.discord.voice.getVoiceSettings();
                break;
            case 'GET_SELECTED_VOICE_CHANNEL':
                logger.log('got channel')
                const initialData: GetChannelType = data;
                setInitial(initialData)
                break;
            case 'GET_VOICE_SETTINGS':
                logger.log('got voicesettigns')
                const voiceSettingsData: VoiceSettingsType = data;
                setIsMuted(voiceSettingsData.data.mute)
                setIsDeafened(voiceSettingsData.data.deaf)
                break;
            case 'VOICE_STATE_CREATE':
                const voiceStateCreateData: VoiceStateType = data;


                setCallState((prevCallState): VoiceUsers | null => {
                    if (!prevCallState) return null;

                    const updatedCallState = { ...prevCallState };
                    updatedCallState[voiceStateCreateData.data.user.id] = {
                        uid: voiceStateCreateData.data.user.id,
                        speaking: false,
                        profile: `https://cdn.discordapp.com/avatars/${voiceStateCreateData.data.user.id}/${voiceStateCreateData.data.user.avatar}?size=1024`, // Set your default value
                        nickname: voiceStateCreateData.data.nick,
                        muted: voiceStateCreateData.data.voice_state.mute,
                        deafened: voiceStateCreateData.data.voice_state.deaf,
                        selfmuted: voiceStateCreateData.data.voice_state.self_mute,
                        selfdeafened: voiceStateCreateData.data.voice_state.self_deaf
                    }
                    logger.log('created Call State:', updatedCallState);
                    return updatedCallState;
                })
                break;
            case 'VOICE_STATE_UPDATE':
                logger.log('Voice State Updated:', data);
                const voiceStateUpdateData: VoiceStateType = data;
                setCallState((prevCallState): VoiceUsers | null => {
                    if (!prevCallState) return null;
                    const updatedCallState = { ...prevCallState };
                    updatedCallState[voiceStateUpdateData.data.user.id] = {
                        uid: voiceStateUpdateData.data.user.id,
                        speaking: prevCallState?.[voiceStateUpdateData.data.user.id]?.speaking || false,
                        profile: `https://cdn.discordapp.com/avatars/${voiceStateUpdateData.data.user.id}/${voiceStateUpdateData.data.user.avatar}?size=1024`, // Set your default value
                        nickname: voiceStateUpdateData.data.nick,
                        muted: voiceStateUpdateData.data.voice_state.mute,
                        deafened: voiceStateUpdateData.data.voice_state.deaf,
                        selfmuted: voiceStateUpdateData.data.voice_state.self_mute,
                        selfdeafened: voiceStateUpdateData.data.voice_state.self_deaf
                    };
                    logger.log('Updated Call State:', updatedCallState);
                    return updatedCallState;  // Return the new state
                });
                break;
            case 'VOICE_STATE_DELETE':
                const voiceStateDeleteData: VoiceStateType = data;
                if (isBeingCalledRef.current) { setIsBeingCalled(false); return; };
                setCallState((prevCallState): VoiceUsers | null => {
                    if (!prevCallState) return null;

                    const updatedCallState = { ...prevCallState };
                    delete updatedCallState[voiceStateDeleteData.data.user.id];
                    return updatedCallState;
                });
                break;
            case 'SPEAKING_START':
                logger.log('Speaking Start:', data);
                const speakingData: SpeakingType = data;
                setCallState((prevCallState): VoiceUsers | null => {
                    if (!prevCallState) return null;

                    const updatedCallState = { ...prevCallState };
                    updatedCallState[speakingData.data.user_id].speaking = true;
                    return updatedCallState;
                })
                break;
            case 'SPEAKING_STOP':
                logger.log('Speaking Stop:', data);
                const speakingStopData: SpeakingType = data
                setCallState((prevCallState): VoiceUsers | null => {
                    if (!prevCallState) return null;

                    const updatedCallState = { ...prevCallState };
                    updatedCallState[speakingStopData.data.user_id].speaking = false;
                    return updatedCallState;
                })
                break;
            case 'VOICE_SETTINGS_UPDATE':
                const voiceSettingsUpdateData: VoiceSettingsType = data;
                setIsMuted(voiceSettingsUpdateData.data.mute)
                setIsDeafened(voiceSettingsUpdateData.data.deaf)
                break;
            case 'NOTIFICATION_CREATE':
                logger.log('discord-create-data:', data)
                const notificationCreateData: DiscordNotificationType = data;
                logger.log('noti-create-data:', notificationCreateData)
                if (notificationCreateData.data.message.type === 3) {
                    const args = {
                        channel_id: notificationCreateData.data.channel_id,
                    }
                    await setIsBeingCalled(true)
                    isBeingCalledRef.current = true
                    await setBeingCalledData(notificationCreateData)
                    beingCalledDataRef.current = notificationCreateData; // Update ref immediately

                    logger.log(`beingcalledData: ${beingCalledData}`)
                    await window.discord.subscribe('VOICE_STATE_DELETE', args)
                    await setChannelId(args.channel_id)

                    logger.log('getting called')
                }
                break;
            default:
                logger.log('Unhandled event:', data.evt, data.cmd);
        }
    }, [])





    const MuteButton = (
        <div id={`icon ${isMuted === true ? 'muted' : ''}`} onClick={handleMute}>
            {isMuted || isDeafened ?
                <MicOffRounded className="mute-button muted" />
                :
                <MicRounded className="mute-button" />
            }
        </div>
    );

    const DeafenButton = (
        <div id='icon' onClick={handleDeafen}>
            {isDeafened ?
                <HeadsetOffRounded className="mute-button muted" />
                :
                <HeadsetRounded className="mute-button" />
            }
        </div>
    );

    const leaveCall = (
        <div id='icon' onClick={handleLeave}>
            <PhoneDisabledRounded className="mute-button" />
        </div>
    );

    const StatusIcon = ({ isMuted, isDeafened }: { isMuted: boolean, isDeafened: boolean }) => (
        <div className={`status-icon ${isDeafened === true ? 'deaf' : isMuted === true ? 'mute' : ''}`} id='icon' >
            {isDeafened === true ?
                <HeadsetOffRounded className="mute-button muted" />
                : isMuted ?
                    <MicOffRounded className="mute-button muted" />
                    : <></>
            }
        </div>
    );

    const pickUpIcon = (
        <div className="join-call" onClick={handleJoin}>
            <PhoneRounded className="join-button" />
        </div>
    );

    const declineIcon = (
        <div className="decline-call" onClick={handleLeave}>
            <CloseRounded className="decline-button" />
        </div>

    )

    return (
        <div className={`discord-call ${isInCall === true ? 'call' : isBeingCalledRef.current === true ? 'ringing' : ''}`}>
            {isBeingCalledRef.current === true && isInCall === false && (
                <>
                    <div className="call-controls">
                        {pickUpIcon}
                    </div>
                    <div className='caller'>
                        <div className='profile-pic'>
                            <img className='caller-image' src={beingCalledData?.data.icon_url} />
                        </div>
                        <div className='call-details'>
                            <span className='call-title'>{beingCalledData?.data.title}</span>
                        </div>
                    </div>
                </>
            )}
            {isInCall === true && (
                <>
                    <div className="call-controls">
                        {MuteButton}
                        {DeafenButton}
                    </div>
                    <div className={`speakers ${isInCall === true ? 'call' : ''}`}>
                        {/* Add speaker components here */}
                        {isInCall && callState && Object.values(callState).map((user, index) => (
                            <div className={`speaker ${user.speaking === true ? 'speaking' : ''}`} key={user.uid}>
                                <img src={user.profile} alt={user.nickname} />
                                <StatusIcon
                                    isMuted={user?.selfmuted || user?.muted || false}
                                    isDeafened={user?.selfdeafened || user?.deafened || false}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="leave-call">
                        {leaveCall}
                    </div>
                </>
            )}

        </div>
    );
};

export default DiscordCall;