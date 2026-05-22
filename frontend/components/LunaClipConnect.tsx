import React, { useState, useEffect, useRef } from 'react';
import { Usb, CheckCircle2, AlertCircle, Fingerprint, Loader2, Terminal, Clock } from 'lucide-react';

const LunaClipConnect = ({ onDataReceived }: { onDataReceived?: (data: any) => void }) => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanProgress, setScanProgress] = useState<number>(0);

  // NEW: Live Terminal Logs & Timestamp
  const [serialLogs, setSerialLogs] = useState<string[]>(["Awaiting USB connection..."]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // NEW: Keep serial references
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the mini terminal
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [serialLogs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectDevice();
    };
  }, []);

  // Simulated progress bar for better UX when scanning starts
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (scanState === 'scanning') {
      setScanProgress(0);

      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 95) return 95;
          return prev + 5;
        });
      }, 400);

    } else if (scanState === 'success') {
      setScanProgress(100);

    } else {
      setScanProgress(0);
    }

    return () => clearInterval(interval);

  }, [scanState]);

  // NEW: Disconnect Function
  const disconnectDevice = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
      }

      if (portRef.current) {
        await portRef.current.close();
      }

    } catch (err) {
      console.log("Disconnect cleanup:", err);
    }

    portRef.current = null;
    readerRef.current = null;
  };

  const connectToDevice = async () => {
    try {
      // CHECK WEB SERIAL SUPPORT
      // @ts-ignore
      if (!navigator.serial) {
        setError(
          "Web Serial API is not supported on this device/WebView. Use latest Chrome or supported Android WebView."
        );
        return;
      }

      setStatus('connecting');
      setError(null);
      setScanState('idle');
      setSerialLogs(["Requesting USB serial permission..."]);

      // REQUEST PORT
      // @ts-ignore
      const port = await navigator.serial.requestPort();

      portRef.current = port;

      setSerialLogs(prev => [...prev, "USB device selected"]);

      // OPEN PORT
      await port.open({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none"
      });

      setStatus('connected');

      setSerialLogs(prev => [
        ...prev,
        "Serial port opened",
        "Connected! Place your finger to begin."
      ]);

      // DECODER STREAM
      const textDecoder = new TextDecoderStream();

      const readableStreamClosed = port.readable.pipeTo(
        textDecoder.writable
      );

      const reader = textDecoder.readable.getReader();

      readerRef.current = reader;

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          reader.releaseLock();
          break;
        }

        if (!value) continue;

        buffer += value;

        // HANDLE BOTH \n and \r\n
        const lines = buffer.split(/\r?\n/);

        buffer = lines.pop() || "";

        for (const line of lines) {

          const cleanLine = line.trim();

          if (!cleanLine) continue;

          // TERMINAL LOGS
          setSerialLogs(prev => [
            ...prev.slice(-7),
            cleanLine
          ]);

          // JSON DATA SUCCESS
          if (cleanLine.includes("JSON_RESULT:")) {

            try {

              const jsonString = cleanLine.substring(
                cleanLine.indexOf("{")
              );

              const parsedData = JSON.parse(jsonString);

              if (parsedData && parsedData.hb) {

                setScanState('success');

                setLastSyncTime(
                  new Date().toLocaleTimeString('en-US', {
                    hour12: true,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })
                );

                if (onDataReceived) {
                  onDataReceived(parsedData);
                }
              }

            } catch (jsonErr) {
              console.error("Failed to parse JSON", jsonErr);
            }
          }

          // SCANNING STARTED
          else if (
            cleanLine.includes("Finger detected") ||
            cleanLine.includes("Scanning Block") ||
            cleanLine.includes("Measuring")
          ) {
            setScanState('scanning');
          }

          // ERRORS
          else if (
            cleanLine.includes("❌") ||
            cleanLine.includes("⚠️ Error") ||
            cleanLine.includes("FAILED") ||
            cleanLine.includes("Removed") ||
            cleanLine.includes("Rejected")
          ) {
            setScanState('error');
          }
        }
      }

      await readableStreamClosed.catch(() => {});

    } catch (err: any) {

      console.error(err);

      setStatus('disconnected');
      setScanState('idle');

      if (
        err?.message?.includes("No port selected") ||
        err?.message?.includes("User cancelled")
      ) {

        setError(
          "Connection cancelled. Please select the USB serial device."
        );

      } else if (
        err?.message?.includes("Failed to open serial port")
      ) {

        setError(
          "Port busy! Close Arduino IDE Serial Monitor or other apps."
        );

      } else if (
        err?.message?.includes("Access denied")
      ) {

        setError(
          "USB permission denied."
        );

      } else {

        setError(
          "USB serial connection failed. Ensure OTG + Arduino are connected."
        );
      }

      await disconnectDevice();
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] sm:rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[420px] relative overflow-hidden">

      {/* Background Pulse Effect when Scanning */}
      {scanState === 'scanning' && (
        <div className="absolute inset-0 bg-indigo-50/30 animate-pulse pointer-events-none"></div>
      )}

      <div className="relative z-10 flex flex-col items-center w-full h-full justify-between">

        {/* TOP: Header & Icon */}
        <div className="w-full flex flex-col items-center text-center mt-2 sm:mt-0">

          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner mb-3 sm:mb-4 transition-all duration-500 ${
            scanState === 'success' ? 'bg-emerald-100 text-emerald-500 scale-110' :
            scanState === 'error' ? 'bg-rose-100 text-rose-500 scale-110' :
            status === 'connected' ? 'bg-indigo-100 text-indigo-500' :
            'bg-slate-50 text-slate-400'
          }`}>

            {scanState === 'scanning' ? (
              <Fingerprint size={28} className="animate-pulse text-indigo-500 sm:w-8 sm:h-8" />
            ) : scanState === 'success' ? (
              <CheckCircle2 size={28} className="sm:w-8 sm:h-8" />
            ) : scanState === 'error' ? (
              <AlertCircle size={28} className="sm:w-8 sm:h-8" />
            ) : (
              <Usb size={28} className={`sm:w-8 sm:h-8 ${status === 'connecting' ? 'animate-pulse' : ''}`} />
            )}

          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-800">
            LunaClip Hardware
          </h3>

          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Live Hb, SpO2 & Heart Rate Sync
          </p>

        </div>

        {/* MIDDLE */}
        <div className="w-full my-5 sm:my-6 space-y-4">

          {/* TERMINAL */}
          <div className="bg-slate-900 rounded-xl p-3 sm:p-4 shadow-inner w-full flex flex-col h-36 sm:h-44 md:h-48 border border-slate-700">

            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">

              <Terminal size={12} className="sm:w-3.5 sm:h-3.5" />

              Live Sensor Console

              {scanState === 'scanning' && (
                <Loader2
                  size={10}
                  className="ml-auto animate-spin text-indigo-400 sm:w-3.5 sm:h-3.5"
                />
              )}

            </div>

            <div className="flex-1 overflow-y-auto text-left font-mono text-[10px] sm:text-xs leading-relaxed flex flex-col justify-end">

              {serialLogs.map((log, i) => (
                <div
                  key={i}
                  className={`truncate ${
                    log.includes("✅") ? "text-emerald-400" :
                    log.includes("❌") || log.includes("⚠️") ? "text-rose-400" :
                    log.includes("JSON_RESULT") ? "text-indigo-400 font-bold" :
                    "text-slate-300"
                  }`}
                >
                  {log}
                </div>
              ))}

              <div ref={logsEndRef} />

            </div>
          </div>

          {/* PROGRESS BAR */}
          {status === 'connected' && (
            <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden shadow-inner">

              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  scanState === 'error' ? 'bg-rose-500 w-full opacity-50' :
                  scanState === 'success' ? 'bg-emerald-500' :
                  'bg-indigo-500 relative'
                }`}
                style={{
                  width: `${scanState === 'error' ? 100 : scanProgress}%`
                }}
              >

                {scanState === 'scanning' && (
                  <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* BOTTOM */}
        <div className="w-full mt-auto flex flex-col items-center">

          {status === 'connected' ? (

            <div className="flex flex-col items-center gap-2.5 sm:gap-2 w-full">

              {lastSyncTime && (
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">

                  <Clock size={12} className="text-slate-400 sm:w-3.5 sm:h-3.5" />

                  Last Synced:
                  <span className="text-slate-700">
                    {lastSyncTime}
                  </span>

                </div>
              )}

              <div className={`flex items-center justify-center gap-2 text-[11px] sm:text-xs font-bold px-4 py-3 sm:py-2.5 rounded-xl sm:rounded-full border w-full sm:w-auto ${
                scanState === 'error'
                  ? 'text-rose-600 bg-rose-50 border-rose-200'
                  : scanState === 'success'
                  ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                  : 'text-indigo-600 bg-indigo-50 border-indigo-200'
              }`}>

                {scanState === 'scanning' ? (
                  <>
                    <Loader2 size={14} className="animate-spin shrink-0" />
                    Measuring Vitals...
                  </>
                ) : scanState === 'error' ? (
                  <>
                    <AlertCircle size={14} className="shrink-0" />
                    Action Required
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>

                    Secure USB Link Active
                  </>
                )}

              </div>

            </div>

          ) : (

            <button
              onClick={connectToDevice}
              disabled={status === 'connecting'}
              className="w-full sm:w-auto mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 sm:py-3.5 px-6 sm:px-8 rounded-xl sm:rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 text-sm sm:text-base"
            >

              <Usb size={18} className="sm:w-5 sm:h-5" />

              {status === 'connecting'
                ? 'Connecting...'
                : 'Connect LunaClip'}

            </button>

          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 text-[11px] sm:text-xs font-medium text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 text-left animate-in fade-in w-full sm:w-auto">

              <AlertCircle
                size={14}
                className="shrink-0 mt-0.5 sm:w-4 sm:h-4"
              />

              <p>{error}</p>

            </div>
          )}

        </div>

      </div>

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>

    </div>
  );
};

export default LunaClipConnect;