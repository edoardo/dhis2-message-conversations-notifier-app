import React, { Component } from 'react';
import './App.css';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import Dialog from 'material-ui/Dialog';
import TextField from 'material-ui/TextField';
import SocialNotificationsActive from 'material-ui/svg-icons/social/notifications-active';
import SocialNotificationsOff from 'material-ui/svg-icons/social/notifications-off';

import { getInstance as getD2 } from 'd2/lib/d2';
import HeaderBarComponent from 'd2-ui/lib/app-header/HeaderBar';
import headerBarStore$ from 'd2-ui/lib/app-header/headerBar.store';
import withStateFrom from 'd2-ui/lib/component-helpers/withStateFrom';

const HeaderBar = withStateFrom(headerBarStore$, HeaderBarComponent);

const QuickReplyDialog = (props) => {
    return (
        <Dialog
            title="Quick reply"
            open={props.open}
        >
            <TextField
                multiLine={true}
                rows={2}
                rowsMax={4}
                hintText="Type here your reply"
            />
        </Dialog>
    );
};

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            notificationsEnabled: false,
            replyDialogOpen: false
        };

        this.handleButtonClick = this.handleButtonClick.bind(this);

        this.serviceWorker = navigator.serviceWorker;
        this.serviceWorker.addEventListener('message', e => {
            this.processMessage(JSON.parse(e.data));
        });

/*        this.apiWorker = new Worker('workers/api.js');
        this.apiWorker.addEventListener('message', e => {
            this.processMessage(JSON.parse(e.data));
        });
*/
        this.processMessage = (message) => {
            switch (message.action) {
                case 'sendNotification':
                    if (Notification.permission === 'granted') {
                        console.log('send notification', message.payload, this.serviceWorker);

                        // relay the notification action to the service worker
                        this.serviceWorker.getRegistration()
                            .then(reg => {
                                const notification = message.payload;

                                reg.showNotification(notification.title, notification.options);
                            });
                    }
                    break;
                case 'quickReply':
                    // open dialog and allow for typing a reply to the message
                    this.setState({
                        replyDialogOpen: true
                    });

                    break;
                default:
                    console.warn('main: noop');
            }
        };
    }

    toggleNotifications = async (enabled) => {
        this.setState({
            notificationsEnabled: enabled
        });

//        const d2 = await getD2();

        console.log('sw', this.serviceWorker);
        //this.apiWorker.postMessage(JSON.stringify({
        this.serviceWorker.controller.postMessage(JSON.stringify({
            action: enabled ? 'startPolling' : 'stopPolling',
//            payload: {
//                d2: d2
//            }
        }));
    };

    handleButtonClick = () => {
        if (! this.state.notificationsEnabled) {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission(permission => {
                    this.toggleNotifications(permission === 'granted');
                });
            }
            else if (Notification.permission === 'granted') {
                this.toggleNotifications(true);
            }
        }
        else if (this.state.notificationsEnabled) {
            this.toggleNotifications(false);
        }
    };

    render() {
        return (
            <MuiThemeProvider>
            <div className="App">
                <h2>Message conversations notifier</h2>
                <p>The most non-interactive and overkill app yet :)</p>
                <RaisedButton
                    primary={true}
                    onClick={this.handleButtonClick}
                    label={this.state.notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                    icon={this.state.notificationsEnabled ? <SocialNotificationsOff /> : <SocialNotificationsActive />}
                />
                <p>
                </p>
                <QuickReplyDialog
                    open={this.state.replyDialogOpen}
                />
            </div>
            </MuiThemeProvider>
        );
    }
}

export default App;
