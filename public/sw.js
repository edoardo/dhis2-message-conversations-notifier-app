let pollingEnabled = false;
let timeoutId;

// TODO read conversations must be purged from the store
const conversationsStore = {};

const getMessageConversations = (options) => {
    console.log('get message called!');
    const url = new URL('http://localhost:8080/api/messageConversations.json');
    //const url = new URL('/api/messageConversations.json');

    const queryParams = {
        paging: 'false',
        fields: 'id,displayName,messageCount,priority,status,messages[displayName,id,sender[displayName]],user[displayName]',
        filter: 'read:eq:false',
    };

    Object.entries(queryParams).forEach(([key, value]) => url.searchParams.append(key, value));
console.log('before fetch');
    fetch(url,
        {
            headers: {
                authorization: `Basic ${btoa('admin:district')}`
            }
        }
    )
    .then(res => res.json())
    .then(data => {
        const conversations = data.messageConversations;

        console.log(conversations);

        if (conversations.length) {
            return Promise.resolve(conversations);
        }
    })
    .then(conversations => {
        let lastMessage;

        conversations.map(c => {
            // new message in a new or existing conversation
            if (! conversationsStore[c.id] || conversationsStore[c.id] < c.messageCount) {
                if (! lastMessage) {
                    lastMessage = c.messages[c.messages.length - 1];
                    console.log('last message', c, c.messages[c.messages.length - 1]);

                    const notification = {
                        // conversations with only 1 message don't pass the sender
                        title: `${lastMessage.sender.displayName || c.user.displayName}: ${c.displayName} (${c.messageCount})`,
                        options: {
                            body: `${lastMessage.displayName}`,
                            icon: '../icon-128x128.jpg',
                            actions: [
                                { action: 'read', title: 'Read' },
                                { action: 'reply', title: 'Reply' }
                            ],
                            data: {
                                mid: c.id
                            },
                        }
                    };

                    //sendNotification(notification);

                    postMessage(JSON.stringify({
                        action: 'sendNotification',
                        payload: notification
                    }));
                }
            }

            conversationsStore[c.id] = c.messageCount;
        });

        return options;
    })
    .catch(err => {
        console.error(err);
    })
    .then(options => {
        if (pollingEnabled) {
            timeoutId = setTimeout(getMessageConversations, 2000, options);
        }
    })
    ;
};

self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

console.log('sw', self);
/*
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let windowClient of windowClients) {
      // Force open pages to refresh, so that they have a chance to load the
      // fresh navigation response from the local dev server.
      windowClient.navigate(windowClient.url);
    }
  });
});
*/

const onMessage = async (message) => {
    switch (message.action) {
        case 'startPolling':
            pollingEnabled = true;
            await getMessageConversations(message.payload);
            break;
        case 'stopPolling':
            pollingEnabled = false;
            clearTimeout(timeoutId);
            break;
        case 'sendNotification':
            sendNotification(message.payload);
            break;
        default:
            console.warn('service worker: noop');
    }
};

self.addEventListener('notificationclick', e => {
    console.log('sw not click', e, e.action, self);

    const data = e.notification.data;

    switch (e.action) {
        case 'read':
            console.log('clients', clients);
            clients.openWindow(`http://localhost:8080/dhis-web-messaging/readMessage.action?id=${data.mid}`);

            break;
        case 'reply':
            console.log('clients', clients);
            // window is not available in service worker
            // postMessage back to the client and open the prompt there instead and postMessage back with the text (or do the request directly there)
            // probably cool to use some React component for the dialog and show a ok/error hint (snackbar?) after the reply is posted
            e.waitUntil(async function () {
                if (e.clientId) {
                    const client = await clients.get(e.clientId);

                    if (client) {
                        client.postMessage({
                            action: 'quickReply'
                        });
                    }
                }
            }());
/*              
            const message = 'Test reply from notification action';

            if (message) {
                // POST request to /dhis-web-messaging/sendReply.action
                // passing: id, text, internal: false
                // or api/messageConversations/${mid}
                // passing the text directly in body
                const params = new URLSearchParams();
                params.append('id', data.mid);
                params.append('text', message); // XXX
                params.append('internal', 'false');

                fetch(`http://localhost:8080/api/messageConversations/${data.mid}`, {
                //fetch('http://localhost:8080/dhis-web-messaging/sendReply.action', {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${btoa('admin:district')}`
                    },
                    body: message
                    //body: params
                })
                .then(() => {
                    //clients.openWindow(`http://localhost:8080/dhis-web-messaging/readMessage.action?id=${data.mid}`);
                });
            }
                */

            break;
        default:
            console.warn('sw notificationclick noop');
    }
});

self.addEventListener('message', e => {
  console.log('message in sw', e, clients);
    e.waitUntil(async function () {
        if (! e.clientId) return;

        const client = await clients.get(e.clientId);

        if (! client) return;

        console.log('client', client);

        onMessage(JSON.parse(e.data));
    }());
});
