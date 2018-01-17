import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
//import registerServiceWorker from './registerServiceWorker';

import { init } from 'd2/lib/d2';

/*init({
    baseUrl: 'http://localhost:8080/api',
    schemas: [],
    headers: {
        authorization: `Basic ${btoa('admin:district')}`
    }
})
.then(() => {*/
    ReactDOM.render(<App />, document.getElementById('root'));

//    registerServiceWorker();
/*
    navigator.serviceWorker.addEventListener('message', e => {
        console.log('received message in sw', e);
    });
*/
    navigator.serviceWorker.ready.then(registration => {
        console.log('service worker ready!', registration, registration.active, navigator.serviceWorker);

        registration.active.addEventListener('notificationclick', e => {
            console.log('notification click', e, e.action);
        });
    });
/*

});
*/
