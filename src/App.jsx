import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Server,
  Upload,
  Radio,
  Video,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Volume2,
  Film,
  Image as ImageIcon,
  KeyRound,
  Download,
  Plus,
  X,
  Activity,
  Heart,
  Cpu,
  ChevronRight,
  Eye,
  Mic,
  Lock,
  Unlock,
  ShieldAlert,
  LogOut,
  Trash2,
  AlertTriangle,
  ChevronLeft
} from "lucide-react";

const getStreamEmbedUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;

    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      const videoId =
        url.hostname === "youtu.be"
          ? url.pathname.split("/").filter(Boolean)[0]
          : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|live|shorts)\/([^/]+)/)?.[1];
      return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : null;
    }

    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const videoId = url.pathname.match(/(?:video\/)?(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
};

const RECENT_STREAMS = [
  {
    id: "REC-CHOIR-20261019",
    title: "WMS Choir: Voices of Hope",
    category: "Music & Performance",
    date: "Oct 19, 2026",
    duration: "38 min",
    views: "1.2k",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "REC-DRAMA-20261017",
    title: "Inter-house Drama: The Crossing",
    category: "Theatre",
    date: "Oct 17, 2026",
    duration: "52 min",
    views: "864",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "REC-JAZZ-20261015",
    title: "Student Jazz Ensemble Session",
    category: "Live Music",
    date: "Oct 15, 2026",
    duration: "31 min",
    views: "692",
    image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=900&q=85"
  }
];

export default function App() {
  const [activeNav, setActiveNav] = useState("student-dashboard");
  const [currentTime, setCurrentTime] = useState("");
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const obsSocketRef = useRef(null);
  const obsPendingRequestsRef = useRef(new Map());
  const obsRequestSequenceRef = useRef(0);
  const liveEventIdRef = useRef(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState("disconnected");
  const [cameraError, setCameraError] = useState("");
  const [streamWatchUrl, setStreamWatchUrl] = useState("");
  const [streamWatchError, setStreamWatchError] = useState("");
  const [obsAddress, setObsAddress] = useState("ws://127.0.0.1:4455");
  const [obsPassword, setObsPassword] = useState("");
  const [obsConnectionState, setObsConnectionState] = useState("disconnected");
  const [obsError, setObsError] = useState("");
  const [obsScenes, setObsScenes] = useState([]);
  const [obsProgramScene, setObsProgramScene] = useState("");
  const [obsPreviewScene, setObsPreviewScene] = useState("");
  const [obsStudioMode, setObsStudioMode] = useState(false);
  const [obsStreamActive, setObsStreamActive] = useState(null);
  const [obsRecordingActive, setObsRecordingActive] = useState(false);
  const [obsStreamDuration, setObsStreamDuration] = useState(0);
  const [obsStreamCongestion, setObsStreamCongestion] = useState(0);
  const [obsAudioInputs, setObsAudioInputs] = useState([]);
  const [liveEventId, setLiveEventId] = useState(null);
  const [selectedBroadcastEventId, setSelectedBroadcastEventId] = useState("EVT-801");
  const [reservedEventIds, setReservedEventIds] = useState([]);
  const [recentStreams, setRecentStreams] = useState(() => {
    try {
      const saved = localStorage.getItem("wms-recent-streams");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : RECENT_STREAMS;
    } catch {
      return RECENT_STREAMS;
    }
  });
  const [favoriteStreamIds, setFavoriteStreamIds] = useState(() => {
    try {
      const saved = localStorage.getItem("wms-favorite-streams-WMS-2026-084");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });

  // Role & Admin Authentication state
  const [userRole, setUserRole] = useState("student"); // "student" | "admin"
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    email: "admin.director@wms.ac.rw",
    key: "WMS-ADMIN-2026"
  });
  const [adminAuthError, setAdminAuthError] = useState("");

  // Live stage console state
  const [isRunning, setIsRunning] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(384); // 6m 24s
  const [currentCue, setCurrentCue] = useState(1);
  const [lightingScene, setLightingScene] = useState("Center Spot + Warm Wash");
  const [stageVenue, setStageVenue] = useState("Grand Auditorium - Hall A");
  const [stageMode, setStageMode] = useState("Rehearsal");
  const [activeMicMutes, setActiveMicMutes] = useState({ mic1: false, mic2: true, mic3: false });
  const [heroSlides, setHeroSlides] = useState([
    {
      title: "A stage for every story.",
      subtitle: "World Mission School brings students together through music, performance, and community.",
      label: "WORLD MISSION SCHOOL",
      image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1800&q=85"
    },
    {
      title: "The next generation, in the spotlight.",
      subtitle: "Celebrate the talent, ideas, and ambition of our high school community.",
      label: "STUDENT LIFE",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1800&q=85"
    },
    {
      title: "Together, we make it happen.",
      subtitle: "One school. Many voices. A shared mission to learn, create, and lead.",
      label: "OUR COMMUNITY",
      image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=85"
    }
  ]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroUploadError, setHeroUploadError] = useState("");
  const [cueLogs, setCueLogs] = useState([
    { time: "19:15:02", text: "Master audio patched to PA Main L/R" },
    { time: "19:22:40", text: "Lighting preset transitioned to Warm Wash" },
    { time: "19:28:10", text: "Performer digital stage pass verified via QR" }
  ]);

  // Daily Schedule state
  const [selectedDay, setSelectedDay] = useState("today");
  const [eventsList, setEventsList] = useState([
    {
      id: "EVT-801",
      day: "today",
      title: "Senior Music Ensemble Showcase",
      venue: "Grand Auditorium - Hall A",
      time: "19:30 - 20:30",
      seatsTotal: 180,
      seatsTaken: 124,
      category: "Music & Performance",
      crew: "Sound Team Alpha",
      streamUrl: "",
      image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=85"
    },
    {
      id: "EVT-802",
      day: "today",
      title: "Inter-house Drama Showcase",
      venue: "Amphitheater Stage",
      time: "20:45 - 22:00",
      seatsTotal: 120,
      seatsTaken: 74,
      category: "Theatre",
      crew: "Lighting Deck Beta",
      streamUrl: "",
      image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1000&q=85"
    },
    {
      id: "EVT-803",
      day: "tomorrow",
      title: "Live Sound & Lighting Workshop",
      venue: "Digital Arts Media Lab",
      time: "09:00 - 11:30",
      seatsTotal: 45,
      seatsTaken: 28,
      category: "Student Workshop",
      crew: "Lead AV Technician",
      streamUrl: "",
      image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85"
    },
    {
      id: "EVT-804",
      day: "tomorrow",
      title: "WMS Choir — Open Rehearsal",
      venue: "Grand Auditorium - Hall A",
      time: "13:00 - 14:30",
      seatsTotal: 220,
      seatsTaken: 156,
      category: "Music & Performance",
      crew: "Sound Team Alpha",
      streamUrl: "",
      image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85"
    },
    {
      id: "EVT-805",
      day: "friday",
      title: "WMS Cultural Gala",
      venue: "Main Campus Arena",
      time: "15:00 - 19:00",
      seatsTotal: 500,
      seatsTaken: 342,
      category: "Campus Event",
      crew: "Full Production Crew",
      streamUrl: "",
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85"
    }
  ]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    venue: "Grand Auditorium - Hall A",
    time: "15:00 - 17:00",
    seatsTotal: 100,
    category: "General Event",
    day: "today",
    streamUrl: "",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85"
  });

  // Student Validation Form state
  const [studentForm, setStudentForm] = useState({
    name: "IRAKOZE Gift Darcy",
    email: "g.darcy@wms.ac.rw",
    studentId: "WMS-2026-084",
    department: "Software Development",
    talentCategory: "Sound Engineering & Stage Systems"
  });
  const [formErrors, setFormErrors] = useState({});
  const [generatedPass, setGeneratedPass] = useState(null);

  // Media Upload Vault state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaVault, setMediaVault] = useState([
    {
      id: "MED-902",
      name: "Chamber Choir Multi-Cam 4K.mp4",
      size: "2.4 GB",
      type: "video",
      format: "H.265 / ProRes",
      res: "3840 x 2160 (60 fps)",
      date: "Sep 28, 2026",
      verified: true
    },
    {
      id: "MED-903",
      name: "Drama Lighting Cue Stills RAW.zip",
      size: "840 MB",
      type: "photo",
      format: "Canon CR3 / DNG",
      res: "24.1 Megapixels",
      date: "Sep 27, 2026",
      verified: true
    },
    {
      id: "MED-904",
      name: "Grand Stage Audio Multitrack 32ch.wav",
      size: "1.1 GB",
      type: "audio",
      format: "PCM Uncompressed 96kHz/24bit",
      res: "32 Isolated Tracks",
      date: "Sep 26, 2026",
      verified: true
    }
  ]);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(null);

  // Clock runner
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stage timer runner
  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlideIndex((index) => (index + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    try {
      localStorage.setItem("wms-favorite-streams-WMS-2026-084", JSON.stringify(favoriteStreamIds));
    } catch {
      // Favorites remain available in memory when browser storage is disabled.
    }
  }, [favoriteStreamIds]);

  useEffect(() => {
    try {
      localStorage.setItem("wms-recent-streams", JSON.stringify(recentStreams));
    } catch {
      // Recent stream history remains available in memory when browser storage is disabled.
    }
  }, [recentStreams]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const triggerCueAction = (actionName) => {
    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });
    setCueLogs((prev) => [{ time: timeStr, text: `Triggered: ${actionName}` }, ...prev.slice(0, 4)]);
  };

  const refreshCameraDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setCameraError("Camera access is unavailable in this browser. Use a current browser over HTTPS or localhost.");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setCameraDevices(cameras);
      if (cameras[0]) setSelectedCameraId((currentId) => currentId || cameras[0].deviceId);
    } catch {
      setCameraError("Could not list camera devices. Check browser permissions and try again.");
    }
  };

  const handleConnectCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires a supported browser and a secure page (HTTPS or localhost).");
      return;
    }

    try {
      const constraints = {
        audio: false,
        video: {
          ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 }
        }
      };
      const nextStream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = nextStream;
      setCameraStream(nextStream);
      setCameraStatus("connected");
      const activeDeviceId = nextStream.getVideoTracks()[0]?.getSettings().deviceId;
      if (activeDeviceId) setSelectedCameraId(activeDeviceId);
      await refreshCameraDevices();
    } catch (error) {
      const messages = {
        NotAllowedError: "Camera permission was denied. Allow camera access in your browser and try again.",
        NotFoundError: "No camera was found. Connect a webcam or HDMI capture device and retry.",
        NotReadableError: "The selected camera is busy in another app or unavailable. Close the other app and retry.",
        OverconstrainedError: "The selected camera cannot provide the requested video mode. Choose another camera."
      };
      if (!cameraStreamRef.current) setCameraStatus("disconnected");
      setCameraError(messages[error.name] || "The camera could not be connected. Check the device and browser permissions.");
    }
  };

  const handleDisconnectCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setCameraStatus("disconnected");
    setCameraError("");
  };

  useEffect(() => {
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return undefined;
    const handleDeviceChange = () => refreshCameraDevices();
    mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, []);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const sendObsRequest = (requestType, requestData = {}) =>
    new Promise((resolve, reject) => {
      const socket = obsSocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error("Connect to OBS before using production controls."));
        return;
      }

      const requestId = `wms-${++obsRequestSequenceRef.current}`;
      const timeout = setTimeout(() => {
        obsPendingRequestsRef.current.delete(requestId);
        reject(new Error(`OBS did not respond to ${requestType}.`));
      }, 8000);
      obsPendingRequestsRef.current.set(requestId, { resolve, reject, timeout, requestType });
      socket.send(JSON.stringify({
        op: 6,
        d: { requestType, requestId, requestData }
      }));
    });

  const refreshObsState = async () => {
    if (!obsSocketRef.current || obsSocketRef.current.readyState !== WebSocket.OPEN) return;
    try {
      const [sceneResponse, streamResponse, recordResponse, studioResponse, inputsResponse] = await Promise.all([
        sendObsRequest("GetSceneList"),
        sendObsRequest("GetStreamStatus"),
        sendObsRequest("GetRecordStatus"),
        sendObsRequest("GetStudioModeEnabled"),
        sendObsRequest("GetInputList")
      ]);
      setObsScenes(sceneResponse.scenes || []);
      setObsProgramScene(sceneResponse.currentProgramSceneName || "");
      setObsStreamActive(Boolean(streamResponse.outputActive));
      setObsStreamDuration(Math.floor((streamResponse.outputDuration || 0) / 1000));
      setObsStreamCongestion(streamResponse.outputCongestion || 0);
      setObsRecordingActive(Boolean(recordResponse.outputActive));
      setObsStudioMode(Boolean(studioResponse.studioModeEnabled));

      const audioInputs = (inputsResponse.inputs || []).filter((input) =>
        /audio|mic/i.test(`${input.inputKind || ""} ${input.inputName || ""}`)
      );
      const inputState = await Promise.all(audioInputs.map(async (input) => {
        try {
          const [muteResponse, volumeResponse] = await Promise.all([
            sendObsRequest("GetInputMute", { inputName: input.inputName }),
            sendObsRequest("GetInputVolume", { inputName: input.inputName })
          ]);
          return {
            name: input.inputName,
            muted: Boolean(muteResponse.inputMuted),
            volume: Math.round((volumeResponse.inputVolumeMul || 0) * 100)
          };
        } catch (error) {
            return { name: input.inputName, muted: null, volume: null, error: error.message };
        }
      }));
      setObsAudioInputs(inputState);
      setObsError("");
    } catch (error) {
      setObsError(error.message || "Could not refresh OBS status.");
    }
  };

  const handleConnectObs = () => {
    setObsError("");
    let socketUrl;
    try {
      socketUrl = new URL(obsAddress);
      if (!["ws:", "wss:"].includes(socketUrl.protocol)) throw new Error("Use a ws:// or wss:// OBS WebSocket address.");
      if (!socketUrl.hostname) throw new Error("Enter a valid OBS WebSocket address.");
    } catch (error) {
      setObsError(error.message || "Enter a valid OBS WebSocket address.");
      return;
    }

    obsSocketRef.current?.close();
    setObsConnectionState("connecting");
    setObsStreamActive(null);
    setObsScenes([]);

    let socket;
    try {
      socket = new WebSocket(socketUrl.toString());
      obsSocketRef.current = socket;
    } catch {
      setObsConnectionState("disconnected");
      setObsError("Could not create the OBS connection. Check the address and browser security policy.");
      return;
    }

    socket.onmessage = async (message) => {
      let payload;
      try {
        payload = JSON.parse(message.data);
      } catch {
        setObsError("OBS sent an unreadable WebSocket message.");
        return;
      }

      if (payload.op === 0) {
        try {
          const authentication = payload.d.authentication;
          let identifyData = { rpcVersion: payload.d.rpcVersion, eventSubscriptions: 127 };
          if (authentication) {
            if (!obsPassword) {
              setObsError("This OBS server requires a WebSocket password. Enter it and reconnect.");
              socket.close();
              return;
            }
            const encodeSha256 = async (value) => {
              const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
              return btoa(String.fromCharCode(...new Uint8Array(digest)));
            };
            const secret = await encodeSha256(`${obsPassword}${authentication.salt}`);
            identifyData = {
              ...identifyData,
              authentication: await encodeSha256(`${secret}${authentication.challenge}`)
            };
          }
          socket.send(JSON.stringify({ op: 1, d: identifyData }));
        } catch {
          setObsError("Could not authenticate with OBS. Check the password and WebSocket settings.");
          socket.close();
        }
        return;
      }

      if (payload.op === 2) {
        if (obsSocketRef.current !== socket) return;
        setObsConnectionState("connected");
        setObsPassword("");
        setObsError("");
        try {
          const [scenes, program, preview, studio] = await Promise.all([
            sendObsRequest("GetSceneList"),
            sendObsRequest("GetCurrentProgramScene"),
            sendObsRequest("GetCurrentPreviewScene"),
            sendObsRequest("GetStudioModeEnabled")
          ]);
          setObsScenes(scenes.scenes || []);
          setObsProgramScene(program.currentProgramSceneName || scenes.currentProgramSceneName || "");
          setObsPreviewScene(preview.currentPreviewSceneName || "");
          setObsStudioMode(Boolean(studio.studioModeEnabled));
          await refreshObsState();
          triggerCueAction("OBS production control connected");
        } catch (error) {
          setObsError(error.message || "Connected to OBS, but could not read the production state.");
        }
        return;
      }

      if (payload.op === 5) {
        const event = payload.d;
        if (event.eventType === "CurrentProgramSceneChanged") {
          setObsProgramScene(event.eventData.sceneName);
        } else if (event.eventType === "CurrentPreviewSceneChanged") {
          setObsPreviewScene(event.eventData.sceneName);
        } else if (event.eventType === "StudioModeStateChanged") {
          setObsStudioMode(Boolean(event.eventData.studioModeEnabled));
        } else if (event.eventType === "StreamStateChanged") {
          const streamActive = Boolean(event.eventData.outputActive);
          setObsStreamActive(streamActive);
          setObsStreamDuration(Math.floor((event.eventData.outputDuration || 0) / 1000));
          setObsStreamCongestion(event.eventData.outputCongestion || 0);
          if (!streamActive && liveEventIdRef.current) {
            const stoppedEventId = liveEventIdRef.current;
            liveEventIdRef.current = null;
            setLiveEventId(null);
            setStageMode("Standby");
            setEventsList((events) =>
              events.map((eventItem) =>
                eventItem.id === stoppedEventId ? { ...eventItem, streamEnded: true } : eventItem
              )
            );
            triggerCueAction("OBS stream stopped; student player unpublished");
          }
        } else if (event.eventType === "RecordStateChanged") {
          setObsRecordingActive(Boolean(event.eventData.outputActive));
        }
        return;
      }

      if (payload.op === 7) {
        const request = obsPendingRequestsRef.current.get(payload.d.requestId);
        if (!request) return;
        clearTimeout(request.timeout);
        obsPendingRequestsRef.current.delete(payload.d.requestId);
        if (payload.d.requestStatus?.result) {
          request.resolve(payload.d.responseData || {});
        } else {
          request.reject(new Error(payload.d.requestStatus?.comment || `${request.requestType} was rejected by OBS.`));
        }
      }
    };

    socket.onerror = () => {
      setObsError("OBS WebSocket connection failed. Confirm OBS is running and WebSocket Server is enabled.");
    };

    socket.onclose = () => {
      if (obsSocketRef.current !== socket) return;
      obsSocketRef.current = null;
      setObsConnectionState("disconnected");
      setObsStreamActive(null);
      setObsRecordingActive(false);
      for (const request of obsPendingRequestsRef.current.values()) {
        clearTimeout(request.timeout);
        request.reject(new Error("OBS connection closed before the request completed."));
      }
      obsPendingRequestsRef.current.clear();
    };
  };

  const handleDisconnectObs = () => {
    obsSocketRef.current?.close();
    obsSocketRef.current = null;
    setObsConnectionState("disconnected");
    setObsStreamActive(null);
    setObsRecordingActive(false);
    setObsScenes([]);
    setObsAudioInputs([]);
  };

  const handleSetProgramScene = async (sceneName) => {
    try {
      if (obsStudioMode) {
        await sendObsRequest("SetCurrentPreviewScene", { sceneName });
        setObsPreviewScene(sceneName);
      } else {
        await sendObsRequest("SetCurrentProgramScene", { sceneName });
        setObsProgramScene(sceneName);
      }
    } catch (error) {
      setObsError(error.message || `Could not select scene ${sceneName}.`);
    }
  };

  const handleTakeScene = async () => {
    try {
      if (!obsStudioMode) {
        setObsError("Enable Studio Mode in OBS to preview a scene before taking it live.");
        return;
      }
      await sendObsRequest("TriggerStudioModeTransition");
      const response = await sendObsRequest("GetCurrentProgramScene");
      setObsProgramScene(response.currentProgramSceneName || obsPreviewScene);
    } catch (error) {
      setObsError(error.message || "Could not take the preview scene to program.");
    }
  };

  const handleToggleObsRecording = async () => {
    try {
      await sendObsRequest(obsRecordingActive ? "StopRecord" : "StartRecord");
      await refreshObsState();
      triggerCueAction(obsRecordingActive ? "OBS recording stopped" : "OBS recording started");
    } catch (error) {
      setObsError(error.message || "OBS recording control failed.");
    }
  };

  const handleToggleObsMute = async (input) => {
    try {
      await sendObsRequest("SetInputMute", { inputName: input.name, inputMuted: !input.muted });
      setObsAudioInputs((inputs) =>
        inputs.map((currentInput) =>
          currentInput.name === input.name ? { ...currentInput, muted: !input.muted } : currentInput
        )
      );
    } catch (error) {
      setObsError(error.message || `Could not change mute state for ${input.name}.`);
    }
  };

  const handleSetObsVolume = async (inputName, volume) => {
    const normalizedVolume = Number(volume);
    setObsAudioInputs((inputs) =>
      inputs.map((input) => input.name === inputName ? { ...input, volume: normalizedVolume } : input)
    );
    try {
      await sendObsRequest("SetInputVolume", {
        inputName,
        inputVolumeMul: normalizedVolume / 100
      });
    } catch (error) {
      setObsError(error.message || `Could not adjust volume for ${inputName}.`);
      refreshObsState();
    }
  };

  useEffect(() => {
    if (obsConnectionState !== "connected") return undefined;
    const interval = setInterval(refreshObsState, 3000);
    return () => clearInterval(interval);
  }, [obsConnectionState]);

  useEffect(() => () => {
    for (const request of obsPendingRequestsRef.current.values()) clearTimeout(request.timeout);
    obsSocketRef.current?.close();
  }, []);

  useEffect(() => {
    if (!cameraStream) return undefined;
    const videoTrack = cameraStream.getVideoTracks()[0];
    if (!videoTrack) return undefined;
    const handleEnded = () => {
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraStatus("disconnected");
      setCameraError("Camera feed stopped. Reconnect to restore the local preview and check the external encoder separately.");
    };
    videoTrack.addEventListener("ended", handleEnded);
    return () => videoTrack.removeEventListener("ended", handleEnded);
  }, [cameraStream]);

  const handleAddHeroImage = (event) => {
    const files = Array.from(event.target.files || []);
    const invalidFile = files.find((file) => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024);
    if (invalidFile) {
      setHeroUploadError(
        !invalidFile.type.startsWith("image/")
          ? `${invalidFile.name} is not an image. Choose JPG, PNG, WebP, or another image file.`
          : `${invalidFile.name} exceeds the 10 MB image limit.`
      );
      event.target.value = "";
      return;
    }
    if (files.length === 0) return;
    const addedSlides = files.map((file) => ({
      title: file.name.replace(/\.[^/.]+$/, ""),
      subtitle: "A moment from the World Mission School community.",
      label: "SCHOOL GALLERY",
      image: URL.createObjectURL(file)
    }));
    setHeroSlideIndex(heroSlides.length);
    setHeroSlides((slides) => [...slides, ...addedSlides]);
    setHeroUploadError("");
    event.target.value = "";
  };

  const handleRemoveHeroImage = (index) => {
    if (heroSlides.length <= 1) {
      setHeroUploadError("Keep at least one image in the student banner.");
      return;
    }

    const removedSlide = heroSlides[index];
    if (removedSlide.image.startsWith("blob:")) URL.revokeObjectURL(removedSlide.image);
    setHeroSlides((slides) => slides.filter((_, slideIndex) => slideIndex !== index));
    setHeroSlideIndex((currentIndex) => {
      if (currentIndex === index) return Math.max(0, index - 1);
      return currentIndex > index ? currentIndex - 1 : currentIndex;
    });
    setHeroUploadError("");
  };

  const handleFireNextCue = () => {
    const nextCue = currentCue === 3 ? 1 : currentCue + 1;
    setCurrentCue(nextCue);
    triggerCueAction(`Cue 0${nextCue} fired at ${stageVenue}`);
  };

  // Admin login handler
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (!adminCredentials.email.endsWith("@wms.ac.rw")) {
      setAdminAuthError("Institutional access violation. Must end with @wms.ac.rw");
      return;
    }
    if (adminCredentials.key !== "WMS-ADMIN-2026") {
      setAdminAuthError("Invalid administrative security key. Contact Director of IT.");
      return;
    }
    setUserRole("admin");
    setActiveNav("stage");
    setAdminAuthError("");
    setShowAdminModal(false);
    triggerCueAction("Admin Authenticated: Stage Director Mode Active");
  };

  const handleAdminLogout = () => {
    handleDisconnectCamera();
    setUserRole("student");
    setActiveNav("student-dashboard");
    triggerCueAction("Admin Session Terminated. Reverted to Student Mode.");
  };

  // Admin-only event deletion
  const handleDeleteEvent = async (id) => {
    if (userRole !== "admin") return;
    if (liveEventId === id) {
      try {
        if (obsConnectionState !== "connected") throw new Error("Reconnect to OBS before cancelling a live event.");
        if (obsStreamActive) await sendObsRequest("StopStream");
      } catch (error) {
        setObsError(error.message || "Could not stop the live output before cancelling the event.");
        return;
      }
      setLiveEventId(null);
      setStageMode("Standby");
      setObsStreamActive(false);
    }
    setEventsList((prev) => prev.filter((e) => e.id !== id));
    setFavoriteStreamIds((prev) => prev.filter((favoriteId) => favoriteId !== id));
    triggerCueAction(`Admin Override: Event ${id} Cancelled from Timetable`);
  };

  // Student form validator
  const handleValidateStudent = (e) => {
    e.preventDefault();
    const errors = {};
    if (!studentForm.name.trim()) errors.name = "Full name required";
    if (!studentForm.email.endsWith("@wms.ac.rw")) {
      errors.email = "Restricted domain! Must be institutional email (@wms.ac.rw)";
    }
    if (!/^WMS-\d{4}-\d{3}$/.test(studentForm.studentId)) {
      errors.studentId = "Invalid format. Expected: WMS-YYYY-XXX (e.g., WMS-2026-084)";
    }
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      const token = "AUTH-SIG-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const checksum = "SHA256:" + Math.random().toString(16).substring(2, 14);
      setGeneratedPass({
        ...studentForm,
        token,
        checksum,
        issuedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        validUntil: "Dec 31, 2026"
      });
    }
  };

  // Media upload simulation
  const triggerSimulatedUpload = () => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((old) => {
        if (old >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setMediaVault((prev) => [
            {
              id: `MED-${Math.floor(100 + Math.random() * 900)}`,
              name: `Stage_Master_Capture_${Date.now().toString().slice(-4)}.mp4`,
              size: "1.8 GB",
              type: "video",
              format: "ProRes 422 / H.264",
              res: "3840 x 2160 (60 fps)",
              date: "Just Now",
              verified: true
            },
            ...prev
          ]);
          return 100;
        }
        return old + 20;
      });
    }, 400);
  };

  const handleReserveSeat = (id) => {
    if (reservedEventIds.includes(id)) return;
    setEventsList((prev) =>
      prev.map((ev) => {
        if (ev.id === id && ev.seatsTaken < ev.seatsTotal) {
          return { ...ev, seatsTaken: ev.seatsTaken + 1 };
        }
        return ev;
      })
    );
    setReservedEventIds((prev) => [...prev, id]);
  };

  const toggleFavoriteStream = (streamId) => {
    setFavoriteStreamIds((currentIds) =>
      currentIds.includes(streamId)
        ? currentIds.filter((id) => id !== streamId)
        : [...currentIds, streamId]
    );
  };

  const handleStartBroadcast = async () => {
    const selectedEvent = eventsList.find((event) => event.id === selectedBroadcastEventId);
    const embedUrl = getStreamEmbedUrl(streamWatchUrl);

    if (!selectedEvent) {
      setStreamWatchError("Select an event before starting its student stream.");
      return;
    }
    if (obsConnectionState !== "connected") {
      setStreamWatchError("Connect the OBS WebSocket from this control room before going live.");
      return;
    }
    if (!embedUrl) {
      setStreamWatchError("Enter a valid HTTPS YouTube or Vimeo watch link for students.");
      return;
    }

    setStreamWatchError("");
    try {
      if (!obsStreamActive) {
        await sendObsRequest("StartStream");
        let status;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          status = await sendObsRequest("GetStreamStatus");
          if (status.outputActive) break;
        }
        if (!status?.outputActive) {
          throw new Error("OBS did not confirm an active stream. Check the OBS stream service and output.");
        }
        setObsStreamActive(true);
      }

      setEventsList((prev) =>
        prev.map((event) =>
          event.id === selectedEvent.id
            ? { ...event, streamUrl: streamWatchUrl.trim(), streamEnded: false }
            : event
        )
      );
      liveEventIdRef.current = selectedEvent.id;
      setLiveEventId(selectedEvent.id);
      setStageMode("Live");
      setStreamWatchError("");
      triggerCueAction(`OBS stream started and student player published for ${selectedEvent.title}`);
    } catch (error) {
      setStreamWatchError(error.message || "OBS could not start the stream.");
      setObsError(error.message || "OBS could not start the stream.");
    }
  };

  const handleEndBroadcast = async () => {
    const liveEvent = eventsList.find((event) => event.id === liveEventId);
    try {
      if (obsConnectionState !== "connected") {
        throw new Error("OBS is disconnected. Reconnect to stop the live output safely.");
      }
      if (obsStreamActive) {
        await sendObsRequest("StopStream");
        const status = await sendObsRequest("GetStreamStatus");
        if (status.outputActive) throw new Error("OBS still reports the stream as active.");
      }
    } catch (error) {
      setStreamWatchError(error.message || "Could not stop the OBS stream.");
      setObsError(error.message || "Could not stop the OBS stream.");
      return;
    }

    if (liveEvent) {
      setRecentStreams((previousStreams) => [
        {
          id: liveEvent.id,
          title: liveEvent.title,
          category: liveEvent.category,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          duration: formatTimer(obsStreamDuration),
          views: "New",
          image: liveEvent.image
        },
        ...previousStreams
      ]);
      setEventsList((previousEvents) =>
        previousEvents.map((event) =>
          event.id === liveEvent.id ? { ...event, streamEnded: true } : event
        )
      );
    }
    liveEventIdRef.current = null;
    setLiveEventId(null);
    setStageMode("Standby");
    setObsStreamActive(false);
    triggerCueAction(`Student stream ended${liveEvent ? ` for ${liveEvent.title}` : ""}`);
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;
    const item = {
      id: `EVT-${Date.now()}`,
      ...newEvent,
      seatsTaken: 1,
      crew: userRole === "admin" ? "Director Approved" : "Production Assigned"
    };
    setEventsList([item, ...eventsList]);
    setShowEventModal(false);
    setNewEvent({
      title: "",
      venue: "Grand Auditorium - Hall A",
      time: "15:00 - 17:00",
      seatsTotal: 100,
      category: "General Event",
      day: "today"
    });
  };

  const filteredEvents =
    selectedDay === "all" ? eventsList : eventsList.filter((e) => e.day === selectedDay);

  const streamCatalog = [
    ...eventsList.filter((event) => liveEventId === event.id || !event.streamEnded).map((event) => ({
      id: event.id,
      title: event.title,
      category: event.category,
      date: event.day === "today" ? "Today" : event.day === "tomorrow" ? "Tomorrow" : "Fri, Oct 23",
      image: event.image,
      streamUrl: event.streamUrl,
      live: liveEventId === event.id,
      upcoming: liveEventId !== event.id
    })),
    ...recentStreams.map((stream) => ({ ...stream, live: false, upcoming: false }))
  ];
  const currentStreams = streamCatalog.filter((stream) => stream.live);
  const favoriteStreams = streamCatalog.filter((stream) => favoriteStreamIds.includes(stream.id));

  const studentAgenda = [
    { time: "19:30", title: "Senior Music Ensemble Showcase", type: "Performance" },
    { time: "20:00", title: "Student media crew check-in", type: "Production" },
    { time: "20:45", title: "Inter-house Drama Showcase", type: "Performance" }
  ];

  const studentTasks = [
    { title: "Audio mix reflection", due: "Today · 21:30", status: "In progress" },
    { title: "Drama lighting storyboard", due: "Tomorrow · 09:00", status: "Submitted" },
    { title: "Campus festival rehearsal log", due: "Fri · 12:00", status: "Pending" }
  ];

  const studentNavItems = [
    { id: "student-dashboard", label: "Student Dashboard", icon: Activity },
    { id: "student-courses", label: "My Favorite Streams", icon: Heart },
    { id: "student-schedule", label: "Events & Live", icon: Calendar },
    { id: "student-validation", label: "Student Pass", icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 border border-blue-400/30 flex items-center justify-center font-black tracking-wider text-white text-xs shadow-lg shadow-blue-600/20">
            WMS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">
                WORLD MISSION SEM
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                userRole === "admin" 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}>
                {userRole === "admin" ? "DIRECTOR / ADMIN MODE" : "STUDENT PORTAL"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Campus Entertainment & Technical Stage Management Infrastructure
            </p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-400">ENVIRONMENT:</span>
            <span className="text-amber-400 font-bold">LOCAL DEMO</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">SERVER CLOCK:</span>
            <span className="text-white font-bold">{currentTime || "19:38:24"} CAT</span>
          </div>
        </div>

        {/* Admin Login / Logout Switcher */}
        <div className="flex items-center gap-3">
          {userRole === "admin" ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">STAGE DIRECTOR ACTIVE</span>
              </div>
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 hover:text-red-400 border border-slate-800 text-slate-300 text-xs font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Admin</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdminModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold shadow-sm transition"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Enter as Admin</span>
            </button>
          )}

          <button
            onClick={() => setActiveNav("validation")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Student Verification</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1700px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 border-r border-slate-800/80 bg-[#070B14] p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 px-3">
                {userRole === "admin" ? "Operations Deck" : "Student Hub"}
              </span>
              <nav className="mt-2 space-y-1">
                {(userRole === "admin"
                  ? [
                      { id: "stage", label: "Stage Console", icon: Radio, badge: "DEMO" },
                      { id: "broadcast", label: "Live Control Room", icon: Video, badge: liveEventId ? "ON AIR" : undefined },
                      { id: "banner-manager", label: "Student Banner & Photos", icon: ImageIcon, count: heroSlides.length },
                      { id: "schedule", label: "Events Timetable", icon: Calendar, count: eventsList.length },
                      { id: "validation", label: "Student Pass & Validation", icon: ShieldCheck },
                      { id: "media", label: "Media Upload Vault", icon: Film, count: mediaVault.length }
                    ]
                  : studentNavItems
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      if (item.id === "broadcast") refreshCameraDevices();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      activeNav === item.id
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && (
                      <span className="text-[11px] font-mono text-slate-500">{item.count}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {userRole === "admin" && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Admin Safety Overrides
                </span>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Safety actions are simulated in this local dashboard preview.
                </p>
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => {
                      setActiveMicMutes({ mic1: true, mic2: true, mic3: true });
                      triggerCueAction("EMERGENCY OVERRIDE: Master Mic Kill Switch");
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-red-900/40 text-[11px] font-mono text-red-400 border border-slate-800 transition flex items-center justify-between"
                  >
                    <span>Mute All Stage Mics</span>
                    <AlertTriangle className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setLightingScene("Auditorium House Evac Lights");
                      triggerCueAction("EMERGENCY OVERRIDE: 100% Full White House Lighting");
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-900/40 text-[11px] font-mono text-amber-300 border border-slate-800 transition flex items-center justify-between"
                  >
                    <span>Auditorium Full White</span>
                    <Sliders className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> {userRole === "admin" ? "Stage AV Rig" : "Student Performance Pulse"}
              </span>
              <div className="space-y-1.5 text-[11px]">
                {userRole === "admin" ? (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>DMX Controller</span>
                      <span className="text-amber-400 font-mono">SIMULATED</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Digital Snake</span>
                      <span className="text-amber-400 font-mono">DEMO DATA</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Live readiness</span>
                      <span className="text-emerald-400 font-mono">92%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Portfolio momentum</span>
                      <span className="text-blue-400 font-mono">+18%</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-400">World Mission Sem</p>
            <p>{userRole === "admin" ? "Kigali, Rwanda - Event Production" : "Kigali, Rwanda - Student Experience"}</p>
          </div>
        </aside>

        {/* Central Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-950">
          {userRole === "admin" && activeNav === "broadcast" && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Production desk</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Live performance control room</h2>
                  <p className="mt-1 max-w-3xl text-sm text-slate-500">
                    Connect to OBS to switch scenes, manage audio and recording, start the stream output, and publish the student player for the selected event.
                  </p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] ${liveEventId ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                  <span className={`h-2 w-2 rounded-full ${liveEventId ? "animate-pulse bg-red-500" : "bg-slate-400"}`} />
                  {liveEventId ? "On air" : "Off air"}
                </span>
              </div>

              <section className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">OBS Studio connection</h3>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${obsConnectionState === "connected" ? "bg-emerald-50 text-emerald-700" : obsConnectionState === "connecting" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {obsConnectionState}
                      </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500">
                      Connect to OBS WebSocket v5 to switch scenes, control stream/record output, and adjust OBS audio inputs. Run this portal on the same production computer or use a trusted secure WebSocket connection.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {obsConnectionState === "connected" ? (
                      <button
                        type="button"
                        onClick={handleDisconnectObs}
                        className="h-10 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        Disconnect OBS
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectObs}
                        disabled={obsConnectionState === "connecting"}
                        className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        {obsConnectionState === "connecting" ? "Connecting…" : "Connect OBS"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid md:grid-cols-[1fr_1fr_auto] gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    WebSocket address
                    <input
                      value={obsAddress}
                      onChange={(event) => setObsAddress(event.target.value)}
                      disabled={obsConnectionState === "connected"}
                      placeholder="ws://127.0.0.1:4455"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case tracking-normal text-slate-200 placeholder:text-slate-600 disabled:opacity-60"
                    />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    OBS WebSocket password
                    <input
                      type="password"
                      value={obsPassword}
                      onChange={(event) => setObsPassword(event.target.value)}
                      disabled={obsConnectionState === "connected"}
                      placeholder={obsConnectionState === "connected" ? "Connected; password cleared" : "Only if OBS authentication is enabled"}
                      autoComplete="new-password"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case tracking-normal text-slate-200 placeholder:text-slate-600 disabled:opacity-60"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={refreshObsState}
                      disabled={obsConnectionState !== "connected"}
                      className="h-10 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Refresh status
                    </button>
                  </div>
                </div>

                {obsError && (
                  <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {obsError}
                  </div>
                )}
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                  OBS setup: enable <strong>Tools → WebSocket Server Settings</strong> in OBS, keep remote access restricted to trusted devices, and use the matching port/password. This control page sends the WebSocket password only to the OBS address you enter and does not save it.
                </div>
              </section>

              <div className="grid xl:grid-cols-[1.35fr_0.65fr] gap-6">
                <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0B0F19]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Camera input monitor</h3>
                        <p className="text-[11px] text-slate-500">USB webcams and HDMI capture cards appear as camera devices</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${cameraStatus === "connected" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {cameraStatus === "connected" ? "Camera connected" : "No camera feed"}
                    </span>
                  </div>

                  <div className="aspect-video bg-slate-950">
                    {cameraStream ? (
                      <video
                        ref={cameraVideoRef}
                        className="h-full w-full object-contain"
                        autoPlay
                        muted
                        playsInline
                        aria-label="Connected camera preview"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
                          <Video className="h-6 w-6 text-blue-300" />
                        </div>
                        <div className="text-sm font-semibold text-slate-200">Camera preview is waiting for input</div>
                        <p className="max-w-md text-xs leading-relaxed">Connect a USB camera or HDMI capture card, select it below, then allow browser camera access. This page must run on HTTPS or localhost.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-800 p-4">
                    <label className="flex-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                      Camera source
                      <select
                        value={selectedCameraId}
                        onChange={(event) => setSelectedCameraId(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case tracking-normal text-slate-200"
                      >
                        {cameraDevices.length === 0 && <option value="">No camera devices detected</option>}
                        {cameraDevices.map((device, index) => (
                          <option key={device.deviceId || index} value={device.deviceId}>
                            {device.label || `Camera ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={refreshCameraDevices}
                        className="h-10 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        Refresh list
                      </button>
                      {cameraStream ? (
                        <>
                          <button
                            onClick={handleConnectCamera}
                            className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500"
                          >
                            Switch source
                          </button>
                          <button
                            onClick={handleDisconnectCamera}
                            className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleConnectCamera}
                          className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500"
                        >
                          Connect camera
                        </button>
                      )}
                    </div>
                  </div>
                  {cameraError && (
                    <div role="alert" className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {cameraError}
                    </div>
                  )}
                </section>

                <section className="space-y-5 rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-red-400" />
                      <h3 className="text-sm font-bold text-white">Event & student player</h3>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      OBS controls the actual stream output. Choose the scheduled event and its public YouTube/Vimeo watch link; the student player is published only after OBS confirms output is live.
                    </p>
                  </div>

                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    Scheduled event
                    <select
                      value={selectedBroadcastEventId}
                      onChange={(event) => setSelectedBroadcastEventId(event.target.value)}
                      disabled={Boolean(liveEventId)}
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case tracking-normal text-slate-200"
                    >
                      {eventsList.map((event) => (
                        <option key={event.id} value={event.id}>{event.title}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    Student watch link
                    <input
                      type="url"
                      value={streamWatchUrl}
                      disabled={Boolean(liveEventId)}
                      onChange={(event) => {
                        setStreamWatchUrl(event.target.value);
                        setStreamWatchError("");
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case tracking-normal text-slate-200 placeholder:text-slate-600"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">OBS stream</div>
                      <div className={`mt-1 text-sm font-bold ${obsStreamActive ? "text-red-400" : "text-slate-300"}`}>
                        {obsConnectionState !== "connected" ? "Not connected" : obsStreamActive ? "Live output" : "Ready / offline"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Student player</div>
                      <div className={`mt-1 text-sm font-bold ${liveEventId ? "text-emerald-400" : "text-slate-300"}`}>
                        {liveEventId ? "Published" : "Not published"}
                      </div>
                    </div>
                  </div>

                  {streamWatchError && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {streamWatchError}
                    </div>
                  )}

                  {liveEventId ? (
                    <button onClick={handleEndBroadcast} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-500">
                      <Pause className="h-4 w-4" /> Stop OBS stream & unpublish
                    </button>
                  ) : (
                    <button
                      onClick={handleStartBroadcast}
                      disabled={obsConnectionState !== "connected"}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Radio className="h-4 w-4" /> {obsStreamActive ? "Publish student player" : "Start OBS stream & publish"}
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Stream runtime</div>
                      <div className="mt-1 font-mono font-bold text-white">{formatTimer(obsStreamDuration)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Output congestion</div>
                      <div className={`mt-1 font-mono font-bold ${obsStreamCongestion > 0.05 ? "text-amber-400" : "text-emerald-400"}`}>
                        {obsConnectionState === "connected" && obsStreamActive ? `${(obsStreamCongestion * 100).toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                    This page controls OBS and publishes the student watch player. It does not manage a streaming provider’s account or ingest key; configure those securely in OBS. Confirm the public watch URL before students join.
                  </div>
                </section>
              </div>

              <section className="grid xl:grid-cols-2 gap-5">
                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">OBS live switcher</p>
                      <h3 className="mt-1 text-lg font-bold text-white">Scenes & program</h3>
                    </div>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400">
                      {obsStudioMode ? "Studio mode" : "Direct mode"}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Program · live output</div>
                      <div className="mt-2 truncate text-sm font-bold text-red-300">{obsProgramScene || "—"}</div>
                    </div>
                    <label className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {obsStudioMode ? "Preview scene" : "Switch program scene"}
                      <select
                        value={obsStudioMode ? obsPreviewScene : obsProgramScene}
                        onChange={(event) => handleSetProgramScene(event.target.value)}
                        disabled={obsConnectionState !== "connected"}
                        className="mt-2 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case tracking-normal text-slate-200 disabled:opacity-40"
                      >
                        <option value="">Select a scene</option>
                        {obsScenes.map((scene) => (
                          <option key={scene.sceneUuid || scene.sceneName} value={scene.sceneName}>{scene.sceneName}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {obsStudioMode && (
                    <button
                      type="button"
                      onClick={handleTakeScene}
                      disabled={obsConnectionState !== "connected" || !obsPreviewScene}
                      className="mt-3 h-10 w-full rounded-xl bg-amber-500 px-4 text-xs font-bold uppercase tracking-[0.16em] text-white hover:bg-amber-400 disabled:opacity-40"
                    >
                      Take preview to program
                    </button>
                  )}
                  {obsConnectionState !== "connected" && (
                    <p className="mt-3 text-xs text-slate-500">Connect OBS to load its scene collection. Direct mode changes the live scene immediately; Studio Mode lets you preview before taking.</p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">OBS mixer</p>
                      <h3 className="mt-1 text-lg font-bold text-white">Audio inputs & recording</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleObsRecording}
                      disabled={obsConnectionState !== "connected"}
                      className={`rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-40 ${obsRecordingActive ? "bg-red-600 hover:bg-red-500" : "bg-slate-700 hover:bg-slate-600"}`}
                    >
                      {obsRecordingActive ? "Stop recording" : "Start recording"}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {obsAudioInputs.length ? obsAudioInputs.map((input) => (
                      <div key={input.name} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate text-sm font-semibold text-white">{input.name}</div>
                          <button
                            type="button"
                            onClick={() => handleToggleObsMute(input)}
                            disabled={input.muted === null}
                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase disabled:cursor-not-allowed disabled:opacity-40 ${input.muted === null ? "bg-slate-800 text-slate-400" : input.muted ? "bg-red-600 text-white" : "bg-emerald-500/10 text-emerald-300"}`}
                          >
                            {input.muted === null ? "Unavailable" : input.muted ? "Muted" : "Live"}
                          </button>
                        </div>
                        {input.error && <p role="alert" className="mt-1 text-[10px] text-amber-400">{input.error}</p>}
                        <label className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          Level
                          <input
                            type="range"
                            min="0"
                            max="200"
                            step="1"
                            value={input.volume ?? 100}
                            onChange={(event) => handleSetObsVolume(input.name, event.target.value)}
                            disabled={input.volume === null}
                            className="h-2 flex-1 accent-blue-600"
                            aria-label={`${input.name} volume`}
                          />
                          <span className="w-10 text-right font-mono text-slate-300">{input.volume}%</span>
                        </label>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-xs text-slate-500">
                        {obsConnectionState === "connected" ? "No audio inputs were returned by OBS. Add microphones/mixers as OBS audio sources, then refresh." : "Connect OBS to control its audio mixer here."}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] text-slate-500">Recording uses the OBS recording profile and destination configured in OBS.</p>
                </div>
              </section>
            </div>
          )}

          {userRole === "admin" && activeNav === "banner-manager" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Student experience</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Student dashboard banner</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    Add campus photos to the rotating student welcome banner. Select a photo to make it the next slide.
                  </p>
                </div>
                <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">
                  <Upload className="h-4 w-4" />
                  Add banner photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddHeroImage}
                    className="sr-only"
                  />
                </label>
              </div>

              {heroUploadError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {heroUploadError}
                </div>
              )}

              <section
                className="school-hero"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(12, 30, 49, .86) 0%, rgba(12, 30, 49, .52) 52%, rgba(12, 30, 49, .12) 100%), url("${heroSlides[heroSlideIndex].image}")`
                }}
                aria-label="Student banner preview"
              >
                <div className="school-hero__copy">
                  <span className="school-hero__eyebrow">{heroSlides[heroSlideIndex].label}</span>
                  <h2>{heroSlides[heroSlideIndex].title}</h2>
                  <p>{heroSlides[heroSlideIndex].subtitle}</p>
                  <span className="school-hero__link">Student dashboard preview</span>
                </div>
                <div className="school-hero__tools">
                  <div className="school-hero__navigation" aria-label="Banner preview controls">
                    <button
                      type="button"
                      aria-label="Previous banner image"
                      onClick={() => setHeroSlideIndex((index) => (index - 1 + heroSlides.length) % heroSlides.length)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>{String(heroSlideIndex + 1).padStart(2, "0")} / {String(heroSlides.length).padStart(2, "0")}</span>
                    <button
                      type="button"
                      aria-label="Next banner image"
                      onClick={() => setHeroSlideIndex((index) => (index + 1) % heroSlides.length)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Banner photo library</h3>
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG, and WebP images up to 10 MB each · {heroSlides.length} slides</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {heroSlides.map((slide, index) => (
                    <article
                      key={`${slide.image}-${index}`}
                      className={`overflow-hidden rounded-2xl border ${index === heroSlideIndex ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-800"} bg-slate-950/60`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setHeroSlideIndex(index);
                          setHeroUploadError("");
                        }}
                        className="block w-full text-left"
                        aria-label={`Preview banner image ${slide.title}`}
                      >
                        <img className="aspect-[16/8] w-full object-cover" src={slide.image} alt={slide.title} />
                      </button>
                      <div className="flex items-start justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{slide.title}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">{slide.label}</div>
                          {index === heroSlideIndex && <div className="mt-2 text-[10px] font-bold uppercase text-blue-300">Selected slide</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHeroImage(index)}
                          disabled={heroSlides.length <= 1}
                          aria-label={`Remove ${slide.title} from banner`}
                          title={heroSlides.length <= 1 ? "At least one banner image is required" : "Remove banner image"}
                          className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <p className="text-[11px] text-slate-500">Uploaded photos are local to this browser session in the demo. A deployed school portal needs server-side image storage to publish these slides to every student device.</p>
            </div>
          )}

          {userRole !== "admin" && activeNav === "student-dashboard" && (
            <div className="space-y-6">
              <section
                className="school-hero"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(12, 30, 49, .86) 0%, rgba(12, 30, 49, .52) 52%, rgba(12, 30, 49, .12) 100%), url("${heroSlides[heroSlideIndex].image}")`
                }}
                aria-label="Student dashboard highlights"
              >
                <div key={heroSlideIndex} className="school-hero__copy">
                  <span className="school-hero__eyebrow">{heroSlides[heroSlideIndex].label}</span>
                  <h2>{heroSlides[heroSlideIndex].title}</h2>
                  <p>{heroSlides[heroSlideIndex].subtitle}</p>
                  <button
                    type="button"
                    onClick={() => setActiveNav("student-schedule")}
                    className="school-hero__link"
                  >
                    Explore campus events <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="school-hero__tools">
                  <div className="school-hero__navigation" aria-label="Student banner controls">
                    <button
                      type="button"
                      aria-label="Previous banner image"
                      onClick={() => setHeroSlideIndex((index) => (index - 1 + heroSlides.length) % heroSlides.length)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>{String(heroSlideIndex + 1).padStart(2, "0")} / {String(heroSlides.length).padStart(2, "0")}</span>
                    <button
                      type="button"
                      aria-label="Next banner image"
                      onClick={() => setHeroSlideIndex((index) => (index + 1) % heroSlides.length)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid xl:grid-cols-[1.35fr_0.65fr] gap-6">
                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Happening now</p>
                      <h3 className="mt-2 text-xl font-bold text-white">Current streams</h3>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${currentStreams.length ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${currentStreams.length ? "animate-pulse bg-red-500" : "bg-slate-400"}`} />
                      {currentStreams.length ? `${currentStreams.length} live` : "No live stream"}
                    </span>
                  </div>

                  {currentStreams.length ? (
                    <div className="space-y-4">
                      {currentStreams.map((stream) => {
                        const embedUrl = getStreamEmbedUrl(stream.streamUrl);
                        return (
                          <article key={stream.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
                            {embedUrl ? (
                              <div className="aspect-video bg-slate-950">
                                <iframe
                                  className="h-full w-full"
                                  src={embedUrl}
                                  title={`${stream.title} live stream`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>
                            ) : (
                              <img className="aspect-video w-full object-cover" src={stream.image} alt={`${stream.title} performance`} />
                            )}
                            <div className="flex items-center justify-between gap-3 p-4">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">Live now · {stream.category}</span>
                                <h4 className="mt-1 text-base font-bold text-white">{stream.title}</h4>
                                <p className="mt-1 text-xs text-slate-400">{eventsList.find((event) => event.id === stream.id)?.venue}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleFavoriteStream(stream.id)}
                                aria-label={favoriteStreamIds.includes(stream.id) ? "Remove from favorite streams" : "Add to favorite streams"}
                                title={favoriteStreamIds.includes(stream.id) ? "Remove favorite" : "Save stream"}
                                className={`rounded-xl border p-2 transition ${favoriteStreamIds.includes(stream.id) ? "border-pink-500/30 bg-pink-500/10 text-pink-400" : "border-slate-700 text-slate-400 hover:text-pink-400"}`}
                              >
                                <Heart className="h-4 w-4" fill={favoriteStreamIds.includes(stream.id) ? "currentColor" : "none"} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
                      {eventsList.find((event) => event.day === "today")?.image && (
                        <img
                          className="aspect-[2.4/1] w-full object-cover opacity-80"
                          src={eventsList.find((event) => event.day === "today").image}
                          alt="Upcoming WMS campus performance"
                        />
                      )}
                      <div className="p-4">
                        <p className="text-sm font-semibold text-white">The production team is not live yet.</p>
                        <p className="mt-1 text-xs text-slate-400">Save a stream or check the schedule to see what is coming up.</p>
                        <button
                          type="button"
                          onClick={() => setActiveNav("student-schedule")}
                          className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300"
                        >
                          Browse event schedule
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Today</p>
                  <h3 className="mt-2 text-xl font-bold text-white">Agenda</h3>
                  <div className="mt-4 space-y-3">
                    {studentAgenda.map((item) => (
                      <div key={`${item.time}-${item.title}`} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                        <div className="w-14 text-right text-xs font-mono font-bold text-blue-300">{item.time}</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{item.title}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">{item.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">From the WMS stage</p>
                    <h3 className="mt-2 text-xl font-bold text-white">Recent streams</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav("student-courses")}
                    className="text-xs font-semibold text-blue-300 hover:text-blue-200"
                  >
                    My favorites <ChevronRight className="inline h-4 w-4" />
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {recentStreams.slice(0, 3).map((stream) => {
                    const isFavorite = favoriteStreamIds.includes(stream.id);
                    return (
                      <article key={stream.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
                        <div className="relative">
                          <img className="aspect-video w-full object-cover" src={stream.image} alt={`${stream.title} thumbnail`} loading="lazy" />
                          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-1 text-[10px] font-mono text-white">{stream.duration}</span>
                        </div>
                        <div className="p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-300">{stream.category}</div>
                          <h4 className="mt-1 text-sm font-bold text-white">{stream.title}</h4>
                          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                            <span>{stream.date}</span>
                            <span>{stream.views} views</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFavoriteStream(stream.id)}
                            className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${isFavorite ? "border-pink-500/30 bg-pink-500/10 text-pink-300" : "border-slate-700 text-slate-300 hover:border-pink-500/40 hover:text-pink-300"}`}
                          >
                            <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
                            {isFavorite ? "Saved to favorites" : "Save stream"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <p className="mt-3 text-[10px] text-slate-500">Archive thumbnails are illustrative demo content; recordings are only playable when a published replay link is available.</p>
              </section>

              <section className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Workload</p>
                  <h3 className="mt-2 text-xl font-bold text-white">Task board</h3>
                  <div className="mt-4 space-y-3">
                    {studentTasks.map((task) => (
                      <div key={task.title} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{task.title}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">{task.due}</div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${task.status === "Submitted" ? "bg-emerald-500/10 text-emerald-300" : task.status === "Pending" ? "bg-amber-500/10 text-amber-300" : "bg-blue-500/10 text-blue-300"}`}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Campus pulse</p>
                      <h3 className="mt-2 text-xl font-bold text-white">Highlights</h3>
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono text-emerald-300">online</div>
                  </div>
                  <div className="mt-5 grid sm:grid-cols-2 gap-4">
                    {[
                      { label: "Scholarship review", value: "Updated" },
                      { label: "Project mentor", value: "Ms. Uwase" },
                      { label: "Festival team", value: "Audio Crew" },
                      { label: "Next showcase", value: "Nov 14" }
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                        <div className="mt-2 text-lg font-bold text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {userRole !== "admin" && activeNav === "student-courses" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Your watchlist</p>
                  <h2 className="mt-2 text-2xl font-black text-white">My Favorite Streams</h2>
                  <p className="mt-1 text-sm text-slate-500">Save performances you want to follow. Favorites stay on this device for your student profile.</p>
                </div>
                <span className="rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1.5 text-xs font-semibold text-pink-300">
                  {favoriteStreams.length} saved
                </span>
              </div>

              {favoriteStreams.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0B0F19] p-8 text-center">
                  <Heart className="mx-auto h-8 w-8 text-pink-300" />
                  <h3 className="mt-3 text-lg font-bold text-white">Your watchlist is ready</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">Save a recent recording or an upcoming event below. Your saved streams will appear here.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {favoriteStreams.map((stream) => {
                    const embedUrl = stream.live ? getStreamEmbedUrl(stream.streamUrl) : null;
                    return (
                      <article key={stream.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0B0F19]">
                        {stream.live && embedUrl ? (
                          <div className="aspect-video bg-slate-950">
                            <iframe
                              className="h-full w-full"
                              src={embedUrl}
                              title={`${stream.title} live stream`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <img className="aspect-video w-full object-cover" src={stream.image} alt={`${stream.title} thumbnail`} loading="lazy" />
                            <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${stream.live ? "bg-red-600 text-white" : stream.upcoming ? "bg-blue-600 text-white" : "bg-slate-950/80 text-white"}`}>
                              {stream.live ? "Live now" : stream.upcoming ? `Upcoming · ${stream.date}` : "Recent"}
                            </span>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-300">{stream.category}</div>
                          <h3 className="mt-1 text-base font-bold text-white">{stream.title}</h3>
                          {!stream.live && (
                            <p className="mt-2 text-xs text-slate-400">
                              {stream.upcoming ? `${stream.date} · Scheduled performance` : `${stream.date} · ${stream.duration} · ${stream.views} views`}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFavoriteStream(stream.id)}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-xs font-semibold text-pink-300 hover:bg-pink-500/20"
                          >
                            <Heart className="h-3.5 w-3.5" fill="currentColor" /> Remove favorite
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <section className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Discover</p>
                  <h3 className="mt-1 text-lg font-bold text-white">Streams to follow</h3>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {streamCatalog.filter((stream) => !favoriteStreamIds.includes(stream.id)).map((stream) => (
                    <article key={stream.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <img className="h-16 w-24 shrink-0 rounded-xl object-cover" src={stream.image} alt="" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                          {stream.live ? "Live now" : stream.upcoming ? `Upcoming · ${stream.date}` : `Recent · ${stream.date}`}
                        </div>
                        <h4 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{stream.title}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavoriteStream(stream.id)}
                        aria-label={`Add ${stream.title} to favorites`}
                        title="Add to favorites"
                        className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-pink-500/40 hover:text-pink-300"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {userRole !== "admin" && activeNav === "student-schedule" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Student events</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Campus schedule & live performances</h2>
                  <p className="mt-1 text-sm text-slate-500">Reserve an event pass and watch the official stream when the production team goes on air.</p>
                </div>
                {liveEventId && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-red-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Live performance
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: "today", label: "Today · Tue, Oct 20" },
                  { id: "tomorrow", label: "Tomorrow · Wed, Oct 21" },
                  { id: "friday", label: "Friday · Oct 23" },
                  { id: "all", label: "All events" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedDay(tab.id)}
                    className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      selectedDay === tab.id
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-800 bg-[#0B0F19] text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredEvents.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                  No events are scheduled for this date yet.
                </div>
              ) : (
                <div className="grid xl:grid-cols-2 gap-5">
                  {filteredEvents.map((event) => {
                    const isLive = liveEventId === event.id;
                    const embedUrl = isLive ? getStreamEmbedUrl(event.streamUrl) : null;
                    const isReserved = reservedEventIds.includes(event.id);
                    const isFull = event.seatsTaken >= event.seatsTotal;
                    const percent = Math.min(100, Math.round((event.seatsTaken / event.seatsTotal) * 100));
                    return (
                      <article key={event.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        {isLive && embedUrl ? (
                          <div className="aspect-video bg-slate-950">
                            <iframe
                              className="h-full w-full"
                              src={embedUrl}
                              title={`${event.title} live stream`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[2.4/1] items-center justify-center gap-3 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
                            <Video className="h-6 w-6 text-blue-300" />
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.18em]">{isLive ? "Stream player unavailable" : "Scheduled performance"}</div>
                              <div className="mt-1 text-xs text-slate-300">{isLive ? "The configured stream link is invalid." : "The student player opens when the event goes live."}</div>
                            </div>
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">{event.category}</span>
                              <h3 className="mt-2 text-lg font-bold text-slate-900">{event.title}</h3>
                            </div>
                            {isLive && (
                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase text-red-600">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live
                              </span>
                            )}
                          </div>

                          <div className="mt-4 grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-600" />{event.time} CAT</div>
                            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-600" />{event.venue}</div>
                          </div>

                          <div className="mt-5">
                            <div className="mb-1.5 flex justify-between text-[11px] text-slate-500">
                              <span>Seats reserved</span>
                              <span>{event.seatsTaken} / {event.seatsTotal}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <span className="text-xs text-slate-500">Hosted by {event.crew}</span>
                            <button
                              onClick={() => handleReserveSeat(event.id)}
                              disabled={isReserved || isFull}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                              {isReserved ? "Pass reserved" : isFull ? "Fully booked" : "Reserve event pass"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {userRole !== "admin" && activeNav === "student-validation" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Credentials</p>
                <h2 className="mt-2 text-2xl font-black text-white">Student identity & access pass</h2>
              </div>
              <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <div className="mb-4 text-sm text-slate-300">Your digital pass can be used for access, events, and performance check-ins.</div>
                  <button
                    onClick={() => setActiveNav("validation")}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Open full validation form
                  </button>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-[#0B0F19] p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Quick status</div>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between"><span>Institution</span><span className="text-white">WMS</span></div>
                    <div className="flex justify-between"><span>Access</span><span className="text-emerald-300">Approved</span></div>
                    <div className="flex justify-between"><span>Valid until</span><span className="text-white">Dec 31, 2026</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              VIEW 1: LIVE STAGE CONSOLE
             ============================================================== */}
          {activeNav === "stage" && (
            <div className="space-y-6">
              <section
                className="school-hero"
                style={{ backgroundImage: `linear-gradient(90deg, rgba(12, 30, 49, .86) 0%, rgba(12, 30, 49, .52) 52%, rgba(12, 30, 49, .12) 100%), url("${heroSlides[heroSlideIndex].image}")` }}
                aria-label="World Mission School highlights"
              >
                <div key={heroSlideIndex} className="school-hero__copy">
                  <span className="school-hero__eyebrow">{heroSlides[heroSlideIndex].label}</span>
                  <h2>{heroSlides[heroSlideIndex].title}</h2>
                  <p>{heroSlides[heroSlideIndex].subtitle}</p>
                  <button
                    onClick={() => {
                      setSelectedDay("all");
                      setActiveNav("schedule");
                    }}
                    className="school-hero__link"
                  >
                    Explore school events <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="school-hero__tools">
                  <label className="school-hero__add" title="Add photos to the slideshow">
                    <ImageIcon className="w-4 h-4" />
                    <span>Add photos</span>
                    <input type="file" accept="image/*" multiple onChange={handleAddHeroImage} />
                  </label>
                  <div className="school-hero__navigation" aria-label="Slideshow controls">
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={() => setHeroSlideIndex((index) => (index - 1 + heroSlides.length) % heroSlides.length)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>{String(heroSlideIndex + 1).padStart(2, "0")} / {String(heroSlides.length).padStart(2, "0")}</span>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={() => setHeroSlideIndex((index) => (index + 1) % heroSlides.length)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="stage-control-strip" aria-label="Stage session controls">
                <div className="stage-control-strip__identity">
                  <span className="stage-control-strip__signal" />
                  <div>
                    <strong>Stage operations</strong>
                    <span>LOCAL DEMO · HARDWARE NOT CONNECTED</span>
                  </div>
                </div>
                <label>
                  <span>Venue</span>
                  <select
                    value={stageVenue}
                    onChange={(event) => {
                      setStageVenue(event.target.value);
                      triggerCueAction(`Stage venue changed to ${event.target.value}`);
                    }}
                  >
                    <option>Grand Auditorium - Hall A</option>
                    <option>Amphitheater Stage</option>
                    <option>Main Campus Arena</option>
                    <option>Digital Arts Media Lab</option>
                  </select>
                </label>
                <label>
                  <span>Session mode</span>
                  <select
                    value={stageMode}
                    onChange={(event) => {
                      setStageMode(event.target.value);
                      triggerCueAction(`Session mode changed to ${event.target.value}`);
                    }}
                  >
                    <option>Rehearsal</option>
                    <option>Live</option>
                    <option>Standby</option>
                  </select>
                </label>
                <div className="stage-control-strip__state">
                  <span>Session timer</span>
                  <strong>{isRunning ? "Running" : "Paused"}</strong>
                </div>
              </section>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${stageMode === "Live" ? "bg-red-500" : "bg-amber-500"}`} />
                    <span className={`text-xs font-mono font-bold tracking-widest uppercase ${stageMode === "Live" ? "text-red-400" : "text-amber-400"}`}>
                      {stageMode === "Live" ? "SIMULATED LIVE SESSION" : `STAGE ${stageMode.toUpperCase()}`}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{stageVenue} Production Run-of-Show</h2>
                  <p className="text-xs text-slate-400">
                    Rehearsal timer, cue progression, lighting presets, and simulated microphone states
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-right px-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Stage Runtime</span>
                    <span className="text-2xl font-mono font-black text-emerald-400">
                      {formatTimer(elapsedSec)}
                    </span>
                  </div>
                  <div className="flex gap-1.5 border-l border-slate-800 pl-3">
                    <button
                      onClick={() => setIsRunning(!isRunning)}
                      className={`p-2 rounded-lg text-white font-medium text-xs flex items-center justify-center transition ${
                        isRunning ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"
                      }`}
                    >
                      {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setElapsedSec(0)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid with Cues & Audio */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#0B0F19] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          Stage Timeline & Performance Roster
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">Cue #{currentCue} Active</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          cue: 1,
                          performer: "Senior Brass & Percussion Ensemble",
                          act: "Symphonic Overture in G Minor",
                          allocated: "12:00 min",
                          badge: "ON STAGE",
                          micSetup: "Mics 1, 3 Active"
                        },
                        {
                          cue: 2,
                          performer: "Department of Arts Drama Troupe",
                          act: "Historical Monologue & Chorus",
                          allocated: "15:00 min",
                          badge: "NEXT IN WINGS",
                          micSetup: "Wireless Lapels 1-4"
                        },
                        {
                          cue: 3,
                          performer: "Solo Vocalist & Grand Piano Accompaniment",
                          act: "Acoustic Contemporary Medley",
                          allocated: "08:00 min",
                          badge: "STANDBY",
                          micSetup: "Grand Piano Condensers"
                        }
                      ].map((item) => (
                        <div
                          key={item.cue}
                          onClick={() => setCurrentCue(item.cue)}
                          className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                            currentCue === item.cue
                              ? "bg-blue-600/10 border-blue-500/80 shadow-md ring-1 ring-blue-500/30"
                              : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                CUE 0{item.cue}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  item.cue === currentCue
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : item.cue === (currentCue === 3 ? 1 : currentCue + 1)
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {item.cue === currentCue
                                  ? "ON STAGE"
                                  : item.cue === (currentCue === 3 ? 1 : currentCue + 1)
                                  ? "NEXT IN WINGS"
                                  : "STANDBY"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white">{item.performer}</h4>
                            <p className="text-xs text-slate-400">{item.act}</p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-slate-300 block">
                              {item.allocated}
                            </span>
                            <span className="text-[10px] text-blue-400 font-mono">{item.micSetup}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex flex-wrap gap-2">
                    <button
                      onClick={() => triggerCueAction("Audio Crossfade (3 sec)")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500 text-xs font-medium text-slate-200 transition"
                    >
                      Crossfade Audio (3s)
                    </button>
                    <button
                      onClick={() => triggerCueAction("Auditorium Stage Blackout")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-red-500 text-xs font-medium text-red-400 transition"
                    >
                      Blackout Stage
                    </button>
                    <button
                      onClick={() => triggerCueAction("Low-Fog Cryo Release")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500 text-xs font-medium text-slate-200 transition"
                    >
                      Stage Haze Pulse
                    </button>
                    <button
                      onClick={handleFireNextCue}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white ml-auto transition"
                    >
                      Fire Next Cue (0{currentCue === 3 ? 1 : currentCue + 1})
                    </button>
                  </div>
                </div>

                {/* Lighting and Audio */}
                <div className="space-y-6">
                  <div className="bg-[#0B0F19] border border-slate-800 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          DMX Stage Lighting
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400">SIMULATED</span>
                    </div>

                    <div className="space-y-2">
                      {[
                        "Center Spot + Warm Wash",
                        "Dramatic Side Profile Blue",
                        "High-Energy Color Chases",
                        "Monochrome Overhead Key"
                      ].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setLightingScene(preset);
                            triggerCueAction(`Lighting Scene -> ${preset}`);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between border ${
                            lightingScene === preset
                              ? "bg-amber-500/10 border-amber-500 text-amber-300"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span>{preset}</span>
                          {lightingScene === preset && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0B0F19] border border-slate-800 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Wireless Mic Patches
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400">DEMO INPUTS</span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { key: "mic1", label: "Mic 01: Lead Stage Podium", signal: "-14 dB" },
                        { key: "mic2", label: "Mic 02: Headset Drama Lapel", signal: "-22 dB" },
                        { key: "mic3", label: "Mic 03: Instrument Grand Piano", signal: "-8 dB" }
                      ].map((m) => (
                        <div
                          key={m.key}
                          className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Mic className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-200">{m.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-emerald-400">{m.signal}</span>
                            <button
                              onClick={() =>
                                setActiveMicMutes((prev) => ({ ...prev, [m.key]: !prev[m.key] }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                                activeMicMutes[m.key]
                                  ? "bg-red-600 text-white"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              {activeMicMutes[m.key] ? "MUTED" : "LIVE"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-slate-400">RECENT CUE LOG:</span>
                  <span className="text-white font-mono">{cueLogs[0]?.text}</span>
                </div>
                <span className="font-mono text-slate-500 text-[11px]">Logged at {cueLogs[0]?.time} CAT</span>
              </div>
            </div>
          )}

          {/* ==============================================================
              VIEW 2: EVENTS TIMETABLE & SCHEDULER (WITH ADMIN ACTIONS)
             ============================================================== */}
          {activeNav === "schedule" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Campus Events & Performance Schedule</h2>
                  <p className="text-xs text-slate-400">
                    Day-by-day venue occupancy, auditorium allocations, and attendance quotas
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Event Request</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs by Day */}
              <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                {[
                  { id: "today", label: "Today - Oct 20" },
                  { id: "tomorrow", label: "Tomorrow - Oct 21" },
                  { id: "friday", label: "Friday Gala - Oct 23" },
                  { id: "all", label: "All Scheduled Events" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedDay(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      selectedDay === tab.id
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Event Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEvents.map((evt) => {
                  const percent = Math.round((evt.seatsTaken / evt.seatsTotal) * 100);
                  const isFull = evt.seatsTaken >= evt.seatsTotal;
                  return (
                    <div
                      key={evt.id}
                      className="bg-[#0B0F19] border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition group shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {evt.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-slate-500">{evt.id}</span>
                            {userRole === "admin" && (
                              <button
                                onClick={() => handleDeleteEvent(evt.id)}
                                title="Admin: Cancel Event"
                                className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition">
                            {evt.title}
                          </h3>
                          <div className="mt-2 space-y-1 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{evt.venue}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-mono text-slate-300">{evt.time} CAT</span>
                            </div>
                          </div>
                        </div>

                        {/* Capacity Meter */}
                        <div className="pt-2">
                          <div className="flex justify-between text-xs font-mono mb-1.5">
                            <span className="text-slate-400">Venue Capacity:</span>
                            <span className={isFull ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                              {evt.seatsTaken} / {evt.seatsTotal} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isFull ? "bg-red-500" : percent > 85 ? "bg-amber-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">
                          Crew: {evt.crew}
                        </span>
                        <div className="flex items-center gap-2">
                          {userRole === "admin" && (
                            <button
                              onClick={() => {
                                setEventsList((prev) =>
                                  prev.map((e) =>
                                    e.id === evt.id ? { ...e, seatsTotal: e.seatsTotal + 25 } : e
                                  )
                                );
                                triggerCueAction(`Admin: Increased ${evt.id} capacity by +25`);
                              }}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 hover:text-white"
                              title="Expand Seating Capacity (+25)"
                            >
                              +25 Seats
                            </button>
                          )}
                          <button
                            onClick={() => handleReserveSeat(evt.id)}
                            disabled={isFull}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500 text-xs font-semibold text-blue-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isFull ? "Sold Out" : "Reserve Pass"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==============================================================
              VIEW 3: STUDENT TALENT REGISTRATION & PASS VERIFICATION
             ============================================================== */}
          {activeNav === "validation" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white">Student Registration & Pass Verification</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enforces institutional account boundary (@wms.ac.rw) and generates encrypted digital backstage & venue passes.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Registration Form */}
                <div className="bg-[#0B0F19] border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Student Identity Entry
                    </h3>
                  </div>

                  <form onSubmit={handleValidateStudent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Full Name (As registered in Registry)
                      </label>
                      <input
                        type="text"
                        value={studentForm.name}
                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                      {formErrors.name && (
                        <span className="text-[10px] text-red-400 mt-1 block flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {formErrors.name}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Institutional Email Address (@wms.ac.rw)
                      </label>
                      <input
                        type="email"
                        value={studentForm.email}
                        onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                      {formErrors.email && (
                        <span className="text-[10px] text-red-400 mt-1 block flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {formErrors.email}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Student ID Code (Format: WMS-YYYY-XXX)
                      </label>
                      <input
                        type="text"
                        value={studentForm.studentId}
                        onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                      />
                      {formErrors.studentId && (
                        <span className="text-[10px] text-red-400 mt-1 block flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {formErrors.studentId}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                        <select
                          value={studentForm.department}
                          onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option>Software Development</option>
                          <option>Media & Audio Arts</option>
                          <option>Performing Arts</option>
                          <option>General Sciences</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Talent / Role</label>
                        <select
                          value={studentForm.talentCategory}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, talentCategory: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option>Sound Engineering & Stage</option>
                          <option>Vocal Arts & Choir</option>
                          <option>Instrumental Performance</option>
                          <option>Theatrical Drama</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 mt-4"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Validate Identity & Generate Digital Pass</span>
                    </button>
                  </form>
                </div>

                {/* Digital Pass Preview */}
                <div>
                  {generatedPass ? (
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-blue-500/40 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                        <div>
                          <span className="text-[9px] font-mono text-blue-400 font-bold tracking-widest uppercase">
                            INSTITUTIONAL ACCESS PASS
                          </span>
                          <h4 className="text-base font-extrabold text-white">WORLD MISSION SEM</h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          VERIFIED ACTIVE
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-mono font-bold text-blue-400 text-lg">
                            WMS
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-white">{generatedPass.name}</h4>
                            <p className="text-xs text-slate-400">{generatedPass.department}</p>
                            <span className="text-[10px] font-mono text-blue-400 font-semibold">
                              {generatedPass.studentId}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Authorized Domain:</span>
                            <span className="text-white font-mono">{generatedPass.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Assigned Stage Tier:</span>
                            <span className="text-emerald-400 font-semibold">
                              {generatedPass.talentCategory}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Pass Token:</span>
                            <span className="text-blue-400 font-mono">{generatedPass.token}</span>
                          </div>
                        </div>

                        {/* High-Tech QR SVG */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="p-2 bg-white rounded-xl">
                            <svg className="w-20 h-20" viewBox="0 0 100 100">
                              <rect width="100" height="100" fill="white" />
                              <rect x="10" y="10" width="25" height="25" fill="#030712" />
                              <rect x="15" y="15" width="15" height="15" fill="white" />
                              <rect x="65" y="10" width="25" height="25" fill="#030712" />
                              <rect x="70" y="15" width="15" height="15" fill="white" />
                              <rect x="10" y="65" width="25" height="25" fill="#030712" />
                              <rect x="15" y="70" width="15" height="15" fill="white" />
                              <rect x="42" y="42" width="16" height="16" fill="#030712" />
                              <rect x="42" y="15" width="8" height="16" fill="#030712" />
                              <rect x="15" y="42" width="16" height="8" fill="#030712" />
                              <rect x="68" y="42" width="18" height="8" fill="#030712" />
                              <rect x="42" y="68" width="8" height="18" fill="#030712" />
                              <rect x="65" y="65" width="25" height="25" fill="#030712" />
                            </svg>
                          </div>
                          <div className="text-right text-[11px] font-mono text-slate-400 space-y-1">
                            <p className="text-slate-300 font-bold">DIGITAL BADGE</p>
                            <p>{generatedPass.checksum}</p>
                            <p className="text-emerald-400">Valid Through {generatedPass.validUntil}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[340px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-6 text-center text-slate-500">
                      <KeyRound className="w-10 h-10 mb-3 text-slate-600" />
                      <h4 className="text-sm font-bold text-slate-400">No Digital Pass Generated</h4>
                      <p className="text-xs max-w-xs mt-1">
                        Submit the student verification form with an institutional email to generate a scannable credential pass.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              VIEW 4: MULTIMEDIA UPLOAD VAULT
             ============================================================== */}
          {activeNav === "media" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Institutional Media Vault & Transcoder</h2>
                  <p className="text-xs text-slate-400">
                    High-definition video processing, multi-camera audio stems, and archived photographic records
                  </p>
                </div>

                <button
                  onClick={triggerSimulatedUpload}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? `Uploading (${uploadProgress}%)` : "Upload 4K Video / Audio"}</span>
                </button>
              </div>

              {/* Upload Drag & Drop Area */}
              <div
                onClick={triggerSimulatedUpload}
                className="border-2 border-dashed border-slate-800 hover:border-blue-500/80 bg-[#0B0F19] p-8 rounded-2xl text-center cursor-pointer transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 text-blue-400 group-hover:scale-105 transition">
                  <Film className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Click or Drop High-Res Media Here</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Supports MP4, ProRes, MOV, WAV, RAW and DNG files. Automatic background hardware transcoding into H.265.
                </p>

                {isUploading && (
                  <div className="max-w-md mx-auto mt-5">
                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                      <span>Transcoding Chunk Stream...</span>
                      <span className="text-blue-400 font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Media Archive Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {mediaVault.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#0B0F19] border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase">
                          {item.type}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition truncate">
                        {item.name}
                      </h4>

                      <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1 text-[11px] font-mono text-slate-400">
                        <div className="flex justify-between">
                          <span>Format:</span>
                          <span className="text-slate-200">{item.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Resolution:</span>
                          <span className="text-slate-200">{item.res}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payload Size:</span>
                          <span className="text-slate-200">{item.size}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{item.date}</span>
                      <button
                        onClick={() => setSelectedMediaPreview(item)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500 text-xs font-semibold text-blue-400 hover:text-white transition flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Asset</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==============================================================
          MODAL: ADMIN AUTHENTICATION DIALOG
         ============================================================== */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Admin & Stage Director Authentication
                </h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Administrator Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={adminCredentials.email}
                  onChange={(e) =>
                    setAdminCredentials({ ...adminCredentials, email: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Director Security Key Code
                </label>
                <input
                  type="password"
                  required
                  value={adminCredentials.key}
                  onChange={(e) =>
                    setAdminCredentials({ ...adminCredentials, key: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-amber-500 outline-none font-mono"
                />
              </div>

              {adminAuthError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Presentation Demo Key:</p>
                <p className="font-mono text-amber-400">WMS-ADMIN-2026</p>
                <p>Default director email: admin.director@wms.ac.rw</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-md shadow-amber-600/20 flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Authenticate as Stage Director</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: CREATE NEW EVENT DIALOG
         ============================================================== */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Schedule New Campus Event
                </h3>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gospel Choir Soundcheck & Stage Prep"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Venue / Hall</label>
                  <select
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 outline-none"
                  >
                    <option>Grand Auditorium - Hall A</option>
                    <option>Amphitheater Stage</option>
                    <option>Digital Arts Media Lab</option>
                    <option>Main Campus Arena</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Scheduled Day</label>
                  <select
                    value={newEvent.day}
                    onChange={(e) => setNewEvent({ ...newEvent, day: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="friday">Friday Gala</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Time Window (CAT)</label>
                  <input
                    type="text"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Seating Capacity</label>
                  <input
                    type="number"
                    value={newEvent.seatsTotal}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, seatsTotal: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-600/20"
                >
                  Commit Event to Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: MEDIA ASSET INSPECTION
         ============================================================== */}
      {selectedMediaPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white truncate max-w-xs">
                  {selectedMediaPreview.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMediaPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-56 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500 flex items-center justify-center text-blue-400 mb-2">
                <Play className="w-5 h-5 translate-x-0.5" />
              </div>
              <span className="text-xs font-mono text-slate-400">4K Master Audio/Video Preview Player</span>
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>00:00:00</span>
                <span>CHUNKS BUFFERED 100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-400">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-500 uppercase">Encoding Codec</span>
                <span className="text-white font-semibold">{selectedMediaPreview.format}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-500 uppercase">Frame Dimensions</span>
                <span className="text-white font-semibold">{selectedMediaPreview.res}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setSelectedMediaPreview(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
              >
                Close Inspector
              </button>
              <button
                onClick={() => alert("Asset stream signature verified by World Mission Sem.")}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export High-Res Master</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
