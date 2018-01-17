let pollingEnabled = false;
let timeoutId;

// TODO read conversations must be purged from the store
const conversationsStore = {};

const getMessageConversations = (options) => {
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

const sendNotification = (notification) => {
    if (Notification.permission === 'granted') {
        new Notification(
            notification.title,
            notification.options
        );
    }
}

const onMessage = async (message) => {
    console.log('apiWorker message', message);
    switch (message.action) {
        case 'startPolling':
            pollingEnabled = true;
            await getMessageConversations(message.payload);
            break;
        case 'stopPolling':
            pollingEnabled = false;
            clearTimeout(timeoutId);
            break;
        default:
            console.warn('poll worker: noop');
    }
};

self.addEventListener('message', e => {
    onMessage(JSON.parse(e.data));
});
