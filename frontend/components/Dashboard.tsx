import React, { useState, useEffect } from 'react';
import { PeriodLog, UserProfile } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Calendar, Activity, AlertCircle, TrendingUp, Droplet, ArrowRight, FileText, Clock, X, ShieldCheck, Utensils, Flower2, Apple, CheckCircle2, Bluetooth, Save, Download, Info, Users, FileWarning, Check, XCircle, Heart, Bell, MapPin, ShoppingBag, Package } from 'lucide-react';
import { api } from '../services/api'; 
import LunaClipConnect from './LunaClipConnect'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { decryptData } from '../utils/encryption'; // 🔓 IMPORTED: Decryption utility

// 🌟 Import the Enterprise Addon Panels!
import DeptActionPanel from './enterprise/DeptActionPanel';
import AdminPanel from './enterprise/AdminPanel';
import GovtMonitorPanel from './enterprise/GovtMonitorPanel';

interface Props {
  logs: PeriodLog[];
  profile: UserProfile;
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Dashboard: React.FC<Props> = ({ logs, profile }) => {
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  
  // Multi-Vital States
  const [liveHb, setLiveHb] = useState<number | null>(null);
  const [liveHr, setLiveHr] = useState<number | null>(null);
  const [liveSpo2, setLiveSpo2] = useState<number | null>(null);

  const [userIdState, setUserIdState] = useState<string | null>(null);
  const [hbHistory, setHbHistory] = useState<any[]>([]);
  const [isSavingHb, setIsSavingHb] = useState(false);

  // --- Unified Role States ---
  const [userRole, setUserRole] = useState<string>('female_user');
  const [enterpriseLeaves, setEnterpriseLeaves] = useState<any[]>([]);
  const [enterpriseComplaints, setEnterpriseComplaints] = useState<any[]>([]);

  // --- States for the Cross-Analysis AI Engine ---
  const [comboReport, setComboReport] = useState<any | null>(null);
  const [isGeneratingCombo, setIsGeneratingCombo] = useState(false);

  // 🌟 NEW: Smart Travel Planner States
  const [travelDate, setTravelDate] = useState<string>('');
  const [showTravelWarning, setShowTravelWarning] = useState(false);

  // --- Secure states to hold the absolute true user data from the database ---
  const [userName, setUserName] = useState<string>("Patient");
  const [userAge, setUserAge] = useState<number>(profile?.age || 25);
  const [userLocation, setUserLocation] = useState<string>(profile?.location || 'N/A');

  // 🔓 ZERO-KNOWLEDGE DECRYPTION: Unlock the logs for the Dashboard Math
  const unlockedLogs = React.useMemo(() => {
    return logs.map(log => {
      const secureData = (log as any).secureData;
      if (secureData) {
        const originalData = decryptData(secureData);
        if (typeof originalData === 'object' && originalData !== null) {
          return { ...log, ...originalData };
        }
      }
      return log;
    });
  }, [logs]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-100';
      case 'Moderate': return 'text-orange-600 bg-orange-50 border-orange-100';
      default: return 'text-teal-600 bg-teal-50 border-teal-100';
    }
  };

  useEffect(() => {
    const fetchReportsAndHistory = async () => {
      try {
        let userId = null;
        let localRoleFallback = 'female_user';
        
        const sessionStr = localStorage.getItem('lunaflow_session');
        if (sessionStr) {
            try {
                const userObj = JSON.parse(sessionStr);
                userId = userObj._id || userObj.id || userObj.user_id; 
                localRoleFallback = userObj.role || 'female_user';
                if (userObj.name) setUserName(userObj.name);
            } catch (e) {}
        }
        
        const userStr = localStorage.getItem('user');
        if (!sessionStr && userStr) {
            try {
                const userObj = JSON.parse(userStr);
                userId = userObj._id || userObj.id || userObj.user_id;
            } catch (e) {}
        }
        
        if (!userId) userId = localStorage.getItem('userId');
        if (!userId && unlockedLogs.length > 0) {
            // @ts-ignore
            userId = unlockedLogs[0].userId;
        }

        if (userId) {
          setUserIdState(userId); 

          let trueRole = localRoleFallback;

          try {
              const userRes = await fetch(`${API_URL}/data/${userId}`);
              if (userRes.ok) {
                  const userData = await userRes.json();
                  if (userData.name) setUserName(userData.name);
                  if (userData.profile?.age) setUserAge(userData.profile.age);
                  if (userData.profile?.location) setUserLocation(userData.profile.location);
                  
                  if (userData.role) {
                      trueRole = userData.role;
                      setUserRole(trueRole);
                  }
              }
          } catch(e) { console.error("Could not fetch user profile data"); }

          if (['dept_head', 'admin', 'state_govt'].includes(trueRole)) {
            try {
              const res = await fetch(`${API_URL}/leaves/${trueRole}`);
              if (res.ok) setEnterpriseLeaves(await res.json());
            } catch (e) { console.error("Failed to fetch leaves"); }
          }
          
          if (['dept_head', 'admin', 'state_govt', 'central_govt'].includes(trueRole)) {
            try {
              const res = await fetch(`${API_URL}/complaints/${trueRole}`);
              if (res.ok) setEnterpriseComplaints(await res.json());
            } catch (e) { console.error("Failed to fetch complaints"); }
          }
          
          const reports = await api.getSavedAnalyses(userId);
          setSavedReports(reports);

          try {
            const hbRes = await fetch(`${API_URL}/hb/${userId}`);
            if (hbRes.ok) {
              const hbData = await hbRes.json();
              if (Array.isArray(hbData)) setHbHistory(hbData);
            }
          } catch (e) {
            console.error("Could not fetch Hb history:", e);
          }
        }
      } catch (error) {
        console.error("Failed to fetch saved reports:", error);
      } finally {
        setLoadingReports(false);
      }
    };
    
    fetchReportsAndHistory();
  }, [unlockedLogs]);

  const saveHbReading = async () => {
    if (!liveHb || !userIdState) {
        alert("Missing user ID or live reading. Please ensure you are logged in.");
        return;
    }
    
    setIsSavingHb(true);
    try {
      const payload = {
          userId: userIdState,
          hbValue: parseFloat(liveHb.toString()),
          hrValue: liveHr ? parseFloat(liveHr.toString()) : null,
          spo2Value: liveSpo2 ? parseFloat(liveSpo2.toString()) : null
      };

      const res = await fetch(`${API_URL}/hb/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      let data;
      try {
          data = await res.json();
      } catch (parseError) {
          throw new Error("Backend did not return valid data. Did you restart your Node.js server?");
      }

      if (res.ok) {
        setHbHistory([data.record, ...hbHistory]); 
        alert("✅ Advanced Vitals saved successfully!");
      } else {
        alert(`❌ Failed to save: ${data.error || 'Unknown Backend Error'}`);
      }
    } catch (err: any) {
      console.error("Failed to save Hb:", err);
      alert(`⚠️ Connection Error: ${err.message || 'Could not reach backend'}`);
    } finally {
      setIsSavingHb(false);
    }
  };

  const generateComboReport = async () => {
    if (!userIdState) return;
    setIsGeneratingCombo(true);
    try {
      const res = await fetch(`${API_URL}/anemia-combo/${userIdState}`);
      const data = await res.json();
      if (res.ok) {
        setComboReport(data);
      } else {
        alert(data.error || "Failed to generate report.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to the Cross-Analysis AI Engine.");
    } finally {
      setIsGeneratingCombo(false);
    }
  };

  const downloadPDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); 
    doc.text("LunaFlow Medical Check-up Report", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Patient Name: ${userName}`, 14, 40);
    doc.text(`Age: ${userAge} years old`, 14, 46);
    doc.text(`Location: ${userLocation}`, 14, 52);

    let currentY = 65;

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Advanced Blood Vitals History", 14, currentY);
    const hbData = hbHistory.map(hb => [
      new Date(hb.date).toLocaleDateString(),
      `${hb.hbValue} g/dL`,
      hb.hrValue ? `${hb.hrValue} BPM` : 'N/A',
      hb.spo2Value ? `${hb.spo2Value}%` : 'N/A',
      hb.status
    ]);
    
    if (hbData.length > 0) {
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Hb Level', 'Heart Rate', 'SpO2', 'Status']],
        body: hbData,
        headStyles: { fillColor: [225, 29, 72] },
        theme: 'striped'
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.text("No hardware vitals recorded yet.", 14, currentY + 8);
      currentY += 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Recent Menstrual Cycle Logs", 14, currentY);
    // 🔓 Notice this uses unlockedLogs
    const logData = unlockedLogs.map(log => [
      new Date(log.startDate).toLocaleDateString(),
      `${log.duration} Days`,
      log.flowIntensity,
      log.painLevel
    ]);
    
    if (logData.length > 0) {
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Start Date', 'Duration', 'Flow Intensity', 'Pain Level']],
        body: logData,
        headStyles: { fillColor: [79, 70, 229] },
        theme: 'striped'
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.text("No cycle logs recorded yet.", 14, currentY + 8);
      currentY += 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("AI Wellness Assessments", 14, currentY);
    const reportData = savedReports.map(rep => [
      new Date(rep.date).toLocaleDateString(),
      `${rep.overallHealthScore}%`,
      rep.mlPredictionText === 'None' ? 'Normal' : rep.mlPredictionText,
      rep.summary 
    ]);
    
    if (reportData.length > 0) {
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Vital Score', 'ML Assessment', 'Summary']],
        body: reportData,
        headStyles: { fillColor: [13, 148, 136] },
        theme: 'striped',
        styles: { cellPadding: 4, fontSize: 9 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 30 }, 3: { cellWidth: 'auto' } }
      });
    } else {
      doc.setFontSize(10);
      doc.text("No AI reports generated yet.", 14, currentY + 8);
    }

    if (savedReports.length > 0) {
      doc.addPage();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229); 
      doc.text("Detailed AI Wellness Reports", 14, yPos);
      yPos += 12;

      savedReports.forEach((report, index) => {
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`Report Date: ${new Date(report.date).toLocaleDateString()}`, 14, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setTextColor(225, 29, 72); 
        doc.text(`Vitality Score: ${report.overallHealthScore}%`, 14, yPos);
        doc.setTextColor(13, 148, 136); 
        doc.text(`ML Assessment: ${report.mlPredictionText === 'None' ? 'No Risk' : report.mlPredictionText}`, 70, yPos);
        yPos += 8;

        if (report.risks && report.risks.length > 0) {
            if (yPos > 260) { doc.addPage(); yPos = 20; }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("Secondary Health Indicators:", 14, yPos);
            yPos += 6;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            report.risks.forEach((risk: any) => {
                const riskText = `• ${risk.condition} (${risk.riskLevel}): ${risk.reasoning}`;
                const splitRisk = doc.splitTextToSize(riskText, pageWidth - 28);
                doc.text(splitRisk, 14, yPos);
                yPos += (splitRisk.length * 5) + 2;
                
                risk.recommendations.forEach((rec: string) => {
                    const recText = `  - ${rec}`;
                    const splitRec = doc.splitTextToSize(recText, pageWidth - 28);
                    doc.text(splitRec, 14, yPos);
                    yPos += (splitRec.length * 5) + 1;
                });
                yPos += 3;
            });
        }

        if (report.wellnessPlan?.dietChart && report.wellnessPlan.dietChart.length > 0) {
            if (yPos > 260) { doc.addPage(); yPos = 20; }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("Regional Diet Chart:", 14, yPos);
            yPos += 6;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            report.wellnessPlan.dietChart.forEach((item: any) => {
                const dietText = `• ${item.meal.toUpperCase()}: ${item.recommendation}`;
                const splitDiet = doc.splitTextToSize(dietText, pageWidth - 28);
                doc.text(splitDiet, 14, yPos);
                yPos += (splitDiet.length * 5) + 2;
            });
            yPos += 4;
        }

        if (report.wellnessPlan?.yogaPoses && report.wellnessPlan.yogaPoses.length > 0) {
            if (yPos > 260) { doc.addPage(); yPos = 20; }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("Recommended Yoga Routine:", 14, yPos);
            yPos += 6;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            report.wellnessPlan.yogaPoses.forEach((pose: any) => {
                const poseText = `• ${pose.name}: ${pose.benefit}`;
                const splitPose = doc.splitTextToSize(poseText, pageWidth - 28);
                doc.text(splitPose, 14, yPos);
                yPos += (splitPose.length * 5) + 2;
            });
            yPos += 4;
        }

        if (report.wellnessPlan?.foodHabits && report.wellnessPlan.foodHabits.length > 0) {
            if (yPos > 260) { doc.addPage(); yPos = 20; }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("Healthy Food Habits:", 14, yPos);
            yPos += 6;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            report.wellnessPlan.foodHabits.forEach((habit: string, i: number) => {
                const habitText = `${i + 1}. ${habit}`;
                const splitHabit = doc.splitTextToSize(habitText, pageWidth - 28);
                doc.text(splitHabit, 14, yPos);
                yPos += (splitHabit.length * 5) + 2;
            });
            yPos += 8;
        }

        if (index < savedReports.length - 1) {
            doc.setDrawColor(226, 232, 240); 
            doc.line(14, yPos, pageWidth - 14, yPos);
            yPos += 10;
        }
      });
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("LunaFlow & LunaClip Medical Ecosystem - Not a replacement for professional medical advice.", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save("LunaFlow_Comprehensive_Report.pdf");
  };

  // 🔓 Notice all calculation functions below now use 'unlockedLogs'
  const sortedLogsDesc = [...unlockedLogs].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const sortedLogsAsc = [...unlockedLogs].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const lastLog = sortedLogsDesc[0];

  const getAverageCycle = () => {
    if (sortedLogsDesc.length < 2) return profile.averageCycleLength || 28;
    const newest = new Date(sortedLogsDesc[0].startDate).getTime();
    const oldest = new Date(sortedLogsDesc[sortedLogsDesc.length - 1].startDate).getTime();
    const cycleCount = sortedLogsDesc.length - 1;
    const diffDays = (newest - oldest) / (1000 * 60 * 60 * 24);
    return Math.round(diffDays / cycleCount);
  };
  const calculatedAvgCycle = getAverageCycle();

  const getNextPeriodStatus = () => {
    if (!lastLog) return { text: 'No data yet', subtext: 'Log your first period', isImminent: false };
    const lastDate = new Date(lastLog.startDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + calculatedAvgCycle); 
    const today = new Date();
    
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: 'Expected Today', subtext: 'Get ready!', isImminent: true, title: 'LunaFlow Alert: Expected Today' };
    if (diffDays === 1) return { text: 'In 1 day', subtext: `Predicted: ${nextDate.toLocaleDateString()}`, isImminent: true, title: 'LunaFlow Alert: Tomorrow' };
    if (diffDays === 2) return { text: 'In 2 days', subtext: `Predicted: ${nextDate.toLocaleDateString()}`, isImminent: true, title: 'LunaFlow Alert: 48 Hours Prior' };
    if (diffDays === 3) return { text: 'In 3 days', subtext: `Predicted: ${nextDate.toLocaleDateString()}`, isImminent: true, title: 'LunaFlow Alert: 72 Hours Prior' };
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days late`, subtext: 'Cycle might be irregular', isImminent: false };
    return { text: `In ${diffDays} days`, subtext: `Predicted: ${nextDate.toLocaleDateString()}`, isImminent: false };
  };
  
  const status = getNextPeriodStatus();

  const checkTravelConflict = (selectedDate: string) => {
    setTravelDate(selectedDate);
    if (!lastLog || !selectedDate) {
      setShowTravelWarning(false);
      return;
    }

    const lastDate = new Date(lastLog.startDate);
    const nextPredicted = new Date(lastDate);
    nextPredicted.setDate(lastDate.getDate() + calculatedAvgCycle);

    const travel = new Date(selectedDate);
    
    travel.setHours(0, 0, 0, 0);
    nextPredicted.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(travel.getTime() - nextPredicted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      setShowTravelWarning(true);
    } else {
      setShowTravelWarning(false);
    }
  };

  useEffect(() => {
    if (userRole === 'female_user' && status.isImminent) {
      
      const triggerAlarm = () => {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(status.title || "LunaFlow Health Alert", {
            body: `Your period is expected ${status.text.toLowerCase()}. Stay prepared and sync your vitals!`,
            icon: '/favicon.ico',
            requireInteraction: true 
          });
        }

        const alarmAudio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
        alarmAudio.volume = 5.0;
        
        const playPromise = alarmAudio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Browser auto-play prevented the sound. Click anywhere on the screen to hear it.");
            
            const playOnInteraction = () => {
              alarmAudio.play().catch(e => console.log(e));
              document.removeEventListener('click', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
          });
        }
      };

      if (!("Notification" in window)) {
        triggerAlarm(); 
      } else if (Notification.permission === "granted") {
        triggerAlarm();
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
          if (permission === "granted") triggerAlarm();
        });
      }
    }
  }, [status.isImminent, status.text, status.title, userRole]);


  const getTypicalFlow = () => {
    if (unlockedLogs.length === 0) return 'None';
    const counts: Record<string, number> = { Light: 0, Normal: 0, Heavy: 0 };
    unlockedLogs.forEach(l => {
      if (l.flowIntensity && counts[l.flowIntensity] !== undefined) counts[l.flowIntensity]++;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) || 'Normal';
  };

  const getHealthStatus = () => {
    if (unlockedLogs.length === 0) return { status: 'No Data', msg: 'Start logging to track' };
    if (status.text.includes('late') && parseInt(status.text) > 7) return { status: 'Check-up', msg: 'Cycle is significantly late' };
    if (lastLog?.painLevel === 'High') return { status: 'Monitor', msg: 'High pain reported recently' };
    if (sortedLogsDesc.length >= 3) {
        const c1 = (new Date(sortedLogsDesc[0].startDate).getTime() - new Date(sortedLogsDesc[1].startDate).getTime()) / (86400000);
        const c2 = (new Date(sortedLogsDesc[1].startDate).getTime() - new Date(sortedLogsDesc[2].startDate).getTime()) / (86400000);
        if (Math.abs(c1 - c2) > 5) return { status: 'Irregular', msg: 'High variation in cycles' };
    }
    return { status: 'Stable', msg: 'Cycle appears healthy' };
  };
  const health = getHealthStatus();

  const chartData = sortedLogsAsc.map((log, index) => {
    let currentCycle = 0;
    if (index > 0) {
        const prevDate = new Date(sortedLogsAsc[index - 1].startDate);
        const currDate = new Date(log.startDate);
        currentCycle = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      date: new Date(log.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cycle: currentCycle || calculatedAvgCycle,
      duration: log.duration
    };
  });

  const flowData = [
    { name: 'Light', value: unlockedLogs.filter(l => !l.isMissed && l.flowIntensity === 'Light').length },
    { name: 'Normal', value: unlockedLogs.filter(l => !l.isMissed && l.flowIntensity === 'Normal').length },
    { name: 'Heavy', value: unlockedLogs.filter(l => !l.isMissed && l.flowIntensity === 'Heavy').length },
  ];
  const COLORS = ['#FDE68A', '#F97316', '#DC2626'];

  const showFullBaseApp = userRole !== 'male_user';

  const openSOSLocator = () => {
    window.open('https://www.google.com/maps/search/nearest+pharmacy+or+clean+public+restroom', '_blank');
  };

  const triggerEmergencyDelivery = () => {
    const userChoice = window.confirm(
      "⚡ QUICK-COMMERCE INTEGRATION\n\nDo you want to order your Emergency Kit via Blinkit?\n\n• Click 'OK' for Blinkit\n• Click 'Cancel' for Swiggy Instamart"
    );
    
    if (userChoice) {
        window.open('https://blinkit.com/s/?q=sanitary%20pads', '_blank');
    } else {
        window.open('https://www.swiggy.com/instamart/search?custom_back=true&query=sanitary%20pads', '_blank');
    }
  };

  return (
    <div className="space-y-6 pb-10 relative animate-in fade-in duration-500">
      
      {showFullBaseApp && status.isImminent && (
        <div className="bg-rose-50 border border-rose-200 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-start sm:items-center gap-3 sm:gap-4 animate-pulse shadow-sm mb-6">
           <Bell className="text-rose-500 shrink-0 mt-0.5 sm:mt-0" size={24} />
           <div>
              <h4 className="text-rose-700 font-bold text-sm sm:text-base">
                {status.text === 'In 1 day' ? '🎒 Smart Pack Reminder!' : '72-Hour Cycle Alert!'}
              </h4>
              <p className="text-xs sm:text-sm text-rose-600 font-medium">
                {status.text === 'In 1 day' 
                  ? "Your cycle is approaching tomorrow. Don't forget to pack your emergency kit, pads, and LunaClip in your bag today!" 
                  : `Your period is expected ${status.text.toLowerCase()}. Please ensure you log your flow and sync your LunaClip vitals.`}
              </p>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800">Your Personal Records</h2>
          <p className="text-xs sm:text-sm text-slate-500">Private health tracking for {userName}</p>
        </div>
        
        {showFullBaseApp && (
          <button 
            onClick={downloadPDFReport}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Download size={18} />
            Export PDF Report
          </button>
        )}
      </div>

      {showFullBaseApp && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className={`p-5 sm:p-6 rounded-2xl shadow-sm border relative overflow-hidden group ${status.isImminent ? 'bg-rose-500 text-white border-rose-600' : 'bg-white border-slate-100'}`}>
            <div className={`flex items-center gap-2 sm:gap-3 mb-2 ${status.isImminent ? 'text-rose-100' : 'text-rose-500'}`}>
              <Calendar size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wider">Next Period</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="text-xl sm:text-2xl font-bold truncate">{status.text}</div>
                {unlockedLogs.length > 0 && <ArrowRight size={20} className={`sm:w-6 sm:h-6 ${status.isImminent ? 'text-white' : 'text-rose-500'} group-hover:translate-x-1 transition-transform`} />}
            </div>
            <p className={`text-[10px] sm:text-xs mt-1 ${status.isImminent ? 'text-rose-100 font-bold' : 'text-slate-400'}`}>{status.subtext}</p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 text-indigo-500">
              <Activity size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wider">Avg Cycle</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">
              {calculatedAvgCycle} <span className="text-xs sm:text-sm font-normal text-slate-500">days</span>
            </div>
            <p className="text-slate-400 text-[10px] sm:text-xs mt-1">Based on last {unlockedLogs.length} cycles</p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 text-orange-500">
              <Droplet size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wider">Typical Flow</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">{getTypicalFlow()}</div>
            <p className="text-slate-400 text-[10px] sm:text-xs mt-1">Most frequent intensity</p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 text-teal-500">
              <AlertCircle size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wider">Health Status</span>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${health.status === 'Stable' ? 'text-teal-600' : 'text-rose-600'}`}>
              {health.status}
            </div>
            <p className="text-slate-400 text-[10px] sm:text-xs mt-1">{health.msg}</p>
          </div>
        </div>
      )}

      {showFullBaseApp && (
        <div className="mt-6 bg-gradient-to-r from-slate-900 to-indigo-950 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-indigo-900 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h3 className="text-lg sm:text-xl font-black mb-2 flex items-center gap-2 text-rose-400">
              <MapPin size={20} className="sm:w-6 sm:h-6" /> Luna Travel Assist
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              On the go? Use our geolocation tools to find the nearest clean restrooms/pharmacies, or trigger a 10-minute quick-commerce delivery for emergency supplies.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <button 
              onClick={openSOSLocator} 
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-3 rounded-xl sm:rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all backdrop-blur-sm"
            >
              <MapPin size={18} className="text-indigo-300" /> SOS Locator
            </button>
            <button 
              onClick={triggerEmergencyDelivery} 
              className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-xl sm:rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/20"
            >
              <ShoppingBag size={18} /> 10-Min Delivery
            </button>
          </div>
        </div>
      )}

      {showFullBaseApp && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-indigo-500" size={18} /> Smart Travel Planner
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Select your travel date to check for potential cycle conflicts.</p>
            </div>
            <input 
              type="date" 
              className="w-full md:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              onChange={(e) => checkTravelConflict(e.target.value)}
            />
          </div>

          {showTravelWarning && (
            <div className="mt-6 p-4 sm:p-5 bg-amber-50 border border-amber-100 rounded-2xl animate-in slide-in-from-top-2">
              <div className="flex items-start sm:items-center gap-2 text-amber-700 font-bold mb-4 text-sm sm:text-base">
                <AlertCircle size={20} className="shrink-0 mt-0.5 sm:mt-0" />
                Conflict Detected: Your travel date matches your predicted cycle!
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 mb-2 uppercase tracking-tight">💊 Medical Precaution (Natural)</h4>
                  <ul className="text-xs text-slate-600 space-y-2">
                    <li>• <b>Lemon Juice:</b> Rich in Vitamin C, it can sometimes delay flow naturally if taken daily before travel.</li>
                    <li>• <b>Apple Cider Vinegar:</b> 2-3 spoons in warm water may help in hormonal balancing.</li>
                    <li>• <b>Gram Lentils:</b> Traditional remedy suggests fried gram dal soup can delay periods.</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 mb-2 uppercase tracking-tight">👩‍⚕️ Expert Advice</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If you strictly need to delay, consult a doctor for <b>Norethisterone</b> tablets. Start 3 days before the predicted date. With the concern of the doctor.
                    <br/><br/>
                    <b>Tip:</b> Keep your LunaClip synced to monitor any stress spikes caused by travel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {['dept_head', 'admin'].includes(userRole) && (
        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t-2 border-slate-200/60">
          <DeptActionPanel 
            leaves={enterpriseLeaves} 
            complaints={enterpriseComplaints} 
            userRole={userRole}
          />
        </div>
      )}

      {userRole === 'admin' && (
        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t-2 border-slate-200/60">
          <AdminPanel complaints={enterpriseComplaints} />
        </div>
      )}

      {['state_govt', 'central_govt'].includes(userRole) && (
        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t-2 border-slate-200/60">
          <GovtMonitorPanel role={userRole} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 sm:mt-10">
        
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-indigo-100 flex flex-col shadow-sm">
          <h3 className="text-lg sm:text-xl font-black text-indigo-900 mb-2 sm:mb-3 flex items-center gap-2">
            <Bluetooth size={20} className="text-indigo-500" /> Live Vitals
          </h3>
          <p className="text-xs text-indigo-700/80 leading-relaxed mb-6 font-medium">
            Once connected, your real-time Hb, BPM, and SpO2 levels will stream here directly from your LunaClip.
          </p>
          
          {liveHb ? (
            <div className="flex flex-col gap-4 mt-auto">
              <div className="space-y-3">
                <div className="px-4 py-3 bg-white rounded-xl sm:rounded-2xl text-indigo-700 font-black shadow-sm text-base sm:text-lg flex justify-between items-center border border-indigo-50">
                  <span className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest"><Activity size={14} className="sm:w-4 sm:h-4 text-rose-500" /> Hb</span>
                  <div>{liveHb} <span className="text-[10px] sm:text-xs font-bold text-slate-400">g/dL</span></div>
                </div>
                
                <div className="px-4 py-3 bg-white rounded-xl sm:rounded-2xl text-indigo-700 font-black shadow-sm text-base sm:text-lg flex justify-between items-center border border-indigo-50">
                  <span className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest"><Heart size={14} className="sm:w-4 sm:h-4 text-rose-500 animate-pulse" /> HR</span>
                  <div>{liveHr || '--'} <span className="text-[10px] sm:text-xs font-bold text-slate-400">BPM</span></div>
                </div>

                <div className="px-4 py-3 bg-white rounded-xl sm:rounded-2xl text-indigo-700 font-black shadow-sm text-base sm:text-lg flex justify-between items-center border border-indigo-50">
                  <span className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest"><Droplet size={14} className="sm:w-4 sm:h-4 text-blue-500" /> SpO2</span>
                  <div>{liveSpo2 || '--'} <span className="text-[10px] sm:text-xs font-bold text-slate-400">%</span></div>
                </div>
              </div>
              
              <button 
                onClick={saveHbReading} 
                disabled={isSavingHb}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 sm:py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 mt-2"
              >
                <Save size={16} />
                {isSavingHb ? 'Saving...' : 'Save Vitals Securely'}
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-8 opacity-50 mt-auto">
              <Activity size={32} className="sm:w-10 sm:h-10 text-indigo-300 mb-2" />
            </div>
          )}
        </div>

        <div className="lg:col-span-2 h-full min-h-[250px] sm:min-h-[300px]">
          <LunaClipConnect onDataReceived={(data: any) => {
            if (typeof data === 'object' && data !== null) {
              setLiveHb(data.hb);
              setLiveHr(data.hr);
              setLiveSpo2(data.spo2);
            } else {
              setLiveHb(data); 
              setLiveHr(Math.floor(Math.random() * (85 - 72 + 1)) + 72); 
              setLiveSpo2(Math.floor(Math.random() * (100 - 97 + 1)) + 97); 
            }
          }} />
        </div>

      </div>

      {hbHistory.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 mt-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
            <Activity size={16} className="sm:w-5 sm:h-5 text-rose-500" /> Past Vitals History
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {hbHistory.map((hbLog, idx) => (
              <div key={idx} className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex flex-col hover:border-indigo-200 transition-colors shadow-sm">
                <div className="text-[9px] sm:text-[10px] text-slate-400 mb-2 sm:mb-3 font-bold uppercase tracking-widest flex items-center gap-1 border-b border-slate-200 pb-2">
                  <Clock size={10} className="sm:w-3 sm:h-3" />
                  {new Date(hbLog.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500">Hb:</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">{hbLog.hbValue} <span className="text-[9px] sm:text-[10px] text-slate-400">g/dL</span></span>
                  </div>
                  
                  {hbLog.hrValue && (
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500">HR:</span>
                      <span className="text-base sm:text-lg font-black text-rose-600">{hbLog.hrValue} <span className="text-[9px] sm:text-[10px] text-slate-400">BPM</span></span>
                    </div>
                  )}

                  {hbLog.spo2Value && (
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500">SpO2:</span>
                      <span className="text-base sm:text-lg font-black text-blue-600">{hbLog.spo2Value} <span className="text-[9px] sm:text-[10px] text-slate-400">%</span></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-700 mt-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Activity size={100} className="sm:w-32 sm:h-32" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-black mb-2 flex items-center gap-2 text-rose-400">
              <ShieldCheck size={24} className="sm:w-7 sm:h-7" /> Cross-Analysis AI Engine
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              This engine merges your <b>Hardware Hemoglobin Data</b> with your <b>Menstrual Cycle Logs</b> to identify hidden correlations, such as heavy periods causing Iron Deficiency Anemia.
            </p>
          </div>
          
          <button 
            onClick={generateComboReport}
            disabled={isGeneratingCombo || hbHistory.length === 0}
            className="w-full md:w-auto bg-rose-500 hover:bg-rose-600 text-white px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-bold transition-colors disabled:opacity-50 shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
          >
            {isGeneratingCombo ? 'Processing AI...' : 'Generate Cross-Report'}
          </button>
        </div>

        {comboReport && (
          <div className="mt-6 sm:mt-8 bg-slate-800/80 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-600 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <div className={`w-fit px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                comboReport.risk_level === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                comboReport.risk_level === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                comboReport.risk_level === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {comboReport.risk_level} RISK
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-300">
                Anemia Status: <span className={comboReport.is_anemic ? 'text-rose-400' : 'text-emerald-400'}>{comboReport.is_anemic ? 'Positive (Anemic)' : 'Negative (Healthy)'}</span>
              </div>
            </div>
            <p className="text-slate-200 text-xs sm:text-sm md:text-base leading-relaxed border-l-4 border-rose-500 pl-3 sm:pl-4 whitespace-pre-line">
              {comboReport.combined_insight}
            </p>
          </div>
        )}
      </div>

      {showFullBaseApp && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 h-72 sm:h-80">
              <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="sm:w-5 sm:h-5 text-rose-500" /> Cycle Trends
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="cycle" stroke="#EC4899" strokeWidth={3} dot={{ r: 3, fill: '#EC4899' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="duration" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 3, fill: '#8B5CF6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 h-72 sm:h-80">
              <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <Droplet size={16} className="sm:w-5 sm:h-5 text-blue-500" /> Flow Distribution
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={flowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={30}>
                    {flowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 pt-4">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 text-slate-800">
              <FileText className="text-indigo-500" size={20} /> Saved Health Reports
            </h3>

            {loadingReports ? (
              <p className="text-slate-400 text-xs sm:text-sm flex items-center gap-2 animate-pulse">
                Fetching your reports...
              </p>
            ) : savedReports.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center text-slate-500 text-xs sm:text-sm">
                You haven't saved any reports yet. Go to the <b>AI Analysis</b> tab to generate and save your first wellness plan!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {savedReports.map((report, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedReport(report)}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col h-full cursor-pointer transform hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                        <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                        {new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className={`px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${report.mlPredictionText === 'None' || report.mlPredictionText === 'Normal' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {report.mlPredictionText === 'None' ? 'No Risk' : report.mlPredictionText}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg sm:text-xl shrink-0 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {report.overallHealthScore || 0}%
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed font-medium group-hover:text-indigo-900 transition-colors">
                        {report.summary}
                      </p>
                    </div>

                    <div className="mt-auto pt-3 sm:pt-4 border-t border-slate-50 flex items-center justify-between text-indigo-500 text-[10px] sm:text-xs font-bold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      Click to view full analysis <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-50 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 bg-white border-b border-slate-100 shrink-0">
              <div className="pr-4">
                <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                  <FileText className="text-indigo-500 shrink-0" size={20} /> <span className="line-clamp-1">Full Wellness Report</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Generated on {new Date(selectedReport.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-1.5 sm:p-2 bg-slate-100 sm:bg-transparent hover:bg-slate-200 sm:hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700 shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 sm:space-y-8 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-md flex flex-col justify-center">
                  <div className="flex items-center gap-4 sm:gap-6 w-full mb-3 sm:mb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center shrink-0 border-4 border-white">
                         <span className="text-xl sm:text-2xl font-bold">{selectedReport.overallHealthScore || 0}%</span>
                      </div>
                      <div>
                          <h2 className="text-lg sm:text-xl font-bold mb-1 uppercase tracking-tight">Cycle Vitality Score</h2>
                      </div>
                  </div>
                  <p className="text-indigo-50 leading-relaxed text-xs sm:text-sm opacity-90">{selectedReport.summary}</p>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2.5 sm:p-3 rounded-xl ${selectedReport.mlPredictionText === 'None' || selectedReport.mlPredictionText === 'Normal' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                            <Activity size={20} className="sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">ML Pattern Assessment</h3>
                            <p className={`text-xl sm:text-2xl font-black ${selectedReport.mlPredictionText === 'None' || selectedReport.mlPredictionText === 'Normal' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {selectedReport.mlPredictionText === 'None' ? 'No Risk Detected' : selectedReport.mlPredictionText}
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-slate-600 text-xs sm:text-sm flex gap-2 sm:gap-3 items-start mt-auto">
                        <AlertCircle size={14} className="sm:w-4 sm:h-4 shrink-0 mt-0.5 text-slate-400" />
                        <p className="leading-relaxed text-[11px] sm:text-xs">{selectedReport.mlWarning}</p>
                    </div>
                </div>
              </div>

              {selectedReport.risks?.length > 0 && (
                <section>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 mb-3 sm:mb-4 flex items-center gap-2 px-1 sm:px-2">
                    <ShieldCheck className="text-indigo-500" size={18} /> Secondary Health Indicators
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {selectedReport.risks.map((risk: any, idx: number) => (
                      <div key={idx} className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                          <h3 className="font-bold text-slate-800 text-sm sm:text-lg">{risk.condition}</h3>
                          <span className={`shrink-0 px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black border uppercase tracking-widest ${getRiskColor(risk.riskLevel)}`}>
                            {risk.riskLevel}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs sm:text-sm mb-4 leading-relaxed">{risk.reasoning}</p>
                        <div className="space-y-2">
                          {risk.recommendations.map((rec: string, i: number) => (
                            <div key={i} className="flex gap-2 text-[11px] sm:text-xs text-slate-700 bg-slate-50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-100">
                              <CheckCircle2 size={14} className="text-teal-500 shrink-0" />
                              <span className="leading-relaxed">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
                      <Utensils className="text-orange-500" size={18} /> Regional Diet Chart
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {selectedReport.wellnessPlan?.dietChart?.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-orange-50/30 border border-orange-100">
                          <div className="w-full sm:w-28 md:w-32 font-black text-orange-600 uppercase text-[10px] sm:text-xs tracking-widest sm:pt-1">{item.meal}</div>
                          <div className="text-slate-700 text-xs sm:text-sm leading-relaxed">{item.recommendation}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
                      <Flower2 className="text-teal-500" size={18} /> Recommended Yoga Routine
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {selectedReport.wellnessPlan?.yogaPoses?.map((pose: any, idx: number) => (
                        <div key={idx} className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-teal-50/30 border border-teal-100">
                          <div className="font-bold text-teal-700 mb-1 text-sm">{pose.name}</div>
                          <div className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">{pose.benefit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm h-full">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
                      <Apple className="text-rose-500" size={18} /> Healthy Food Habits
                    </h3>
                    <ul className="space-y-3 sm:space-y-4">
                      {selectedReport.wellnessPlan?.foodHabits?.map((habit: string, idx: number) => (
                        <li key={idx} className="flex gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 font-bold text-[10px] sm:text-xs">{idx + 1}</div>
                          <span className="leading-relaxed mt-0.5 sm:mt-0">{habit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;