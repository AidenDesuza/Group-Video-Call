const socket = io("https://group-video-call-3cwr.vercel.app");
const myVideoContainer = document.getElementById('myVideoContainer');
const otherVideosContainer = document.getElementById('otherVideosContainer');
const startCallButton = document.getElementById('startCall');
const peerConnections = {};
const roomId = 'test-room';

startCallButton.onclick = async () => {
    startCallButton.disabled = true;
    await startCall();
};

async function startCall() {
    try {
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        addVideoStream(localStream, myVideoContainer);

        socket.emit('join-room', roomId);

        socket.on('user-connected', (userId) => {
            connectToNewUser(userId, localStream);
        });

        socket.on('user-disconnected', (userId) => {
            if (peerConnections[userId]) {
                peerConnections[userId].close();
                delete peerConnections[userId];
            }
            removeVideo(userId);
        });

        socket.on('receive-signal', async (signal, fromId) => {
            const peerConnection = peerConnections[fromId] || await createPeerConnection(fromId, localStream);
            if (signal.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('send-signal', answer, fromId);
            } else if (signal.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(signal));
            }
        });
    } catch (error) {
        console.error("Error accessing media devices:", error);
    }
}

function addVideoStream(stream, container, userId = null) {
    const videoId = userId ? `video-${userId}` : 'my-video';
    let video = document.getElementById(videoId);

    if (!video) {
        video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.id = videoId;
        container.append(video);
    }
    video.srcObject = stream;
}

function removeVideo(userId) {
    const video = document.getElementById(`video-${userId}`);
    if (video) video.remove();
}

async function connectToNewUser(userId, localStream) {
    const peerConnection = await createPeerConnection(userId, localStream);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('send-signal', offer, userId);
}

async function createPeerConnection(userId, localStream) {
    const peerConnection = new RTCPeerConnection();
    peerConnections[userId] = peerConnection;

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('send-signal', event.candidate, userId);
        }
    };

    peerConnection.ontrack = (event) => {
        addVideoStream(event.streams[0], otherVideosContainer, userId);
    };

    return peerConnection;
}
