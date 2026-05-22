require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

// 🌟 NEW: Require Twilio
const twilio = require('twilio');

const app = express();
app.use(cors());

// 🌟 FIXED: Added 50MB limit so that Base64 Image data can be uploaded without errors
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 🌟 NEW: Initialize Twilio Client (It safely fails to Dev Mode if keys are missing in .env)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log("✅ Twilio Client Initialized");
}

// --- Database Models (Schemas) ---

const userSchema = new mongoose.Schema({
  // 🌟 FIX: Made email optional and added phone. Both are sparse so they don't conflict.
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  name: String,
  user_id: String, // To support Python seeded IDs (STU-001, HOD-001, etc.)
  role: { type: String, default: 'female_user' }, 
  gender: String,
  profile: {
    age: { type: Number, default: 25 },
    averageCycleLength: { type: Number, default: 28 },
    location: { type: String, default: '' }
  }
});

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, required: true }, 
  
  // 🔒 ZERO-KNOWLEDGE ARCHITECTURE: Added field to store the encrypted payload
  secureData: { type: String }, 
  
  // Kept old fields so existing unencrypted data doesn't break
  startDate: String,
  endDate: String,
  duration: Number,
  cycleLength: Number,
  flowIntensity: String,
  painLevel: String,
  symptoms: [String],
  isMissed: Boolean,
  notes: String
});

const analysisRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  date: { type: Date, default: Date.now },
  overallHealthScore: Number,
  summary: String,
  risks: Array, 
  wellnessPlan: Object, 
  disclaimer: String,
  mlPredictionText: String, 
  mlWarning: String        
});

const hbRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  date: { type: Date, default: Date.now },
  hbValue: { type: Number, required: true },
  hrValue: { type: Number, default: null },   // NEW: Heart Rate (BPM)
  spo2Value: { type: Number, default: null }, // NEW: Blood Oxygen (%)
  status: { type: String, required: true }
});

const leaveSchema = new mongoose.Schema({
  applicantId: String,
  applicantName: String,
  applicantRole: String,
  targetRole: String,
  reason: String,
  riskLevel: String,
  hbLevel: Number,
  aiReportSummary: String, 
  vitalityScore: String, 
  status: { type: String, default: 'Pending' }, 
  date: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
  applicantId: String,
  applicantName: String,
  applicantRole: String,
  targetRole: String, // Tracks who the complaint is currently assigned to
  type: String,
  description: String,
  evidence: String, // 🌟 ADDED: To store the Base64 image
  status: { type: String, default: 'Pending' },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const PeriodLog = mongoose.model('PeriodLog', logSchema);
const AnalysisRecord = mongoose.model('AnalysisRecord', analysisRecordSchema);
const HbRecord = mongoose.model('HbRecord', hbRecordSchema);
const LeaveRequest = mongoose.model('LeaveRequest', leaveSchema);
const Complaint = mongoose.model('Complaint', complaintSchema);

// --- Helpers ---

const getUserQuery = (id) => {
  const isValidObjectId = mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === String(id));
  return isValidObjectId ? { _id: id } : { user_id: id };
};

const getMixedUserIdQuery = (id) => {
  const isValidObjectId = mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === String(id));
  if (isValidObjectId) {
    return { $in: [id, new mongoose.Types.ObjectId(id)] };
  }
  return id; 
};

// --- API Routes ---

// 🌟 NEW: TWILIO SMS OTP ROUTE
app.post('/api/auth/send-sms', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!twilioClient) {
      // If Twilio isn't set up in .env yet, simulate it for the Hackathon Demo
      console.log(`[DEV MODE] 📲 Mock SMS sent to ${phone}. OTP is: ${otp}`);
      return res.status(200).json({ success: true, message: "Mock SMS sent (Keys missing in .env)" });
    }

    // Real Twilio sending logic
    await twilioClient.messages.create({
      body: `Your LunaFlow Security Code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    console.log(`✅ SMS OTP sent successfully to ${phone}`);
    res.status(200).json({ success: true, message: "SMS sent successfully" });
  } catch (err) {
    console.error("❌ Twilio Error:", err.message);
    res.status(500).json({ error: "Failed to send SMS via Twilio. Ensure your phone number is verified on Twilio Trial." });
  }
});


// 1. Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, phone, password, name } = req.body;
    
    // 🌟 FIX: Check if either email or phone already exists
    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    if (query.length > 0) {
      const existingUser = await User.findOne({ $or: query });
      if (existingUser) return res.status(400).json({ error: "User already exists with this contact method" });
    }

    const newUser = new User({ email, phone, password, name });
    await newUser.save();
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  try {
    // 🌟 FIX: Frontend might send the identifier as 'email' due to legacy logic. 
    // We treat it as a generic identifier and search BOTH fields.
    const identifier = req.body.email || req.body.identifier; 
    const password = req.body.password;

    const user = await User.findOne({ 
        $or: [
            { email: identifier },
            { phone: identifier }
        ],
        password: password 
    });
    
    if (!user) return res.status(400).json({ error: "Invalid credentials or User might not exist" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch data
app.get('/api/data/:userId', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.userId));
    if (!user) return res.json({ name: "Patient", role: "female_user", profile: { age: 25, averageCycleLength: 28, location: '' }, logs: [] });

    const logs = await PeriodLog.find({ userId: getMixedUserIdQuery(req.params.userId) }).sort({ startDate: -1 });
    res.json({ 
        name: user.name, 
        role: user.role || 'female_user',
        profile: user.profile, 
        logs 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Adding logs
app.post('/api/logs', async (req, res) => {
  try {
    const { userId, log, age } = req.body;
    
    // 🔒 The frontend passes the encrypted `{ secureData: "..." }` object inside `log`.
    // We seamlessly spread it into the new model so MongoDB accepts it.
    const newLog = new PeriodLog({ ...log, userId });
    await newLog.save();

    const logs = await PeriodLog.find({ userId: getMixedUserIdQuery(userId), isMissed: false }).sort({ startDate: -1 });
    let avgCycle = 28;
    if (logs.length > 1) {
       const totalDays = logs.reduce((acc, curr) => acc + (curr.cycleLength || 28), 0);
       avgCycle = Math.round(totalDays / logs.length);
    }

    const updateFields = { 'profile.averageCycleLength': avgCycle };
    if (age !== undefined && age !== null) {
        updateFields['profile.age'] = age;
    }

    // 🧹 CLEANED: Removed 'new: true' warning
    const updatedUser = await User.findOneAndUpdate(getUserQuery(userId), { $set: updateFields }, { returnDocument: 'after' });
    const allLogs = await PeriodLog.find({ userId: getMixedUserIdQuery(userId) }).sort({ startDate: -1 });
    
    res.json({ logs: allLogs, profile: updatedUser ? updatedUser.profile : { age, averageCycleLength: avgCycle } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Profile Update
app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { profile } = req.body;
    const updateObj = {};
    if (profile.age !== undefined) updateObj['profile.age'] = profile.age;
    if (profile.averageCycleLength !== undefined) updateObj['profile.averageCycleLength'] = profile.averageCycleLength;
    if (profile.location !== undefined) updateObj['profile.location'] = profile.location;
    
    // 🧹 CLEANED: Removed 'new: true' warning
    const updatedUser = await User.findOneAndUpdate(getUserQuery(req.params.userId), { $set: updateObj }, { returnDocument: 'after' });
    res.json({ success: true, profile: updatedUser ? updatedUser.profile : profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Delete the log
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    await PeriodLog.findByIdAndDelete(req.params.id);

    const allLogs = await PeriodLog.find({ userId: getMixedUserIdQuery(userId) }).sort({ startDate: -1 });
    const validLogs = allLogs.filter(l => !l.isMissed);
    let avgCycle = 28;
    if (validLogs.length > 1) {
       const totalDays = validLogs.reduce((acc, curr) => acc + (curr.cycleLength || 28), 0);
       avgCycle = Math.round(totalDays / validLogs.length);
    }
    
    // 🧹 CLEANED: Removed 'new: true' warning
    const updatedUser = await User.findOneAndUpdate(getUserQuery(userId), { $set: { 'profile.averageCycleLength': avgCycle } }, { returnDocument: 'after' });
    res.json({ logs: allLogs, profile: updatedUser ? updatedUser.profile : { averageCycleLength: avgCycle } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Reset all
app.delete('/api/reset/:userId', async (req, res) => {
  try {
    await PeriodLog.deleteMany({ userId: getMixedUserIdQuery(req.params.userId) });
    // 🧹 CLEANED: Removed 'new: true' warning
    await User.findOneAndUpdate(getUserQuery(req.params.userId), { $set: { 'profile.averageCycleLength': 28 } }, { returnDocument: 'after' });
    res.json({ success: true, message: "All records reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. ML Health Prediction Route
app.post('/api/predict', async (req, res) => {
  try {
    const { age, cycleLength, duration, flowIntensity, painLevel, symptoms } = req.body;

    const flowMap = { 'Light': 1, 'Normal': 2, 'Heavy': 3 };
    const painMap = { 'Low': 1, 'Medium': 2, 'High': 3 };

    const mappedFlow = flowMap[flowIntensity] || 2; 
    const mappedPain = painMap[painLevel] || 2;     
    const symptomCount = Array.isArray(symptoms) ? symptoms.length : 0;

    const pythonResponse = await axios.post('http://127.0.0.1:8000/predict_health_risk', {
      age: age || 25,
      menstrual_cycle_length: cycleLength || 28,
      maternal_status: 0, 
      period_duration: duration || 5,
      blood_flow: mappedFlow,
      pain_level: mappedPain,
      symptom_count: symptomCount
    });

    res.json({
      success: true,
      prediction: pythonResponse.data.prediction || pythonResponse.data.predicted_condition,
      vitalityScore: pythonResponse.data.vitalityScore || 80,
      warning: pythonResponse.data.warning
    });
  } catch (err) {
    console.error("ML Service Error:", err.message);
    res.status(500).json({ error: "Failed to communicate with ML service." });
  }
});

// 9. SAVE ANALYSIS ROUTE 
app.post('/api/analysis/save', async (req, res) => {
  try {
    const { userId, geminiAnalysis, mlPrediction } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const newRecord = new AnalysisRecord({
      userId: userId,
      overallHealthScore: mlPrediction.score || geminiAnalysis.overallHealthScore,
      summary: geminiAnalysis.summary,
      risks: geminiAnalysis.risks,
      wellnessPlan: geminiAnalysis.wellnessPlan,
      disclaimer: geminiAnalysis.disclaimer,
      mlPredictionText: mlPrediction.prediction, 
      mlWarning: mlPrediction.warning            
    });

    await newRecord.save();
    res.status(201).json({ message: "Analysis saved successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. GET SAVED ANALYSES 
app.get('/api/analysis/:userId', async (req, res) => {
  try {
    const records = await AnalysisRecord.find({ userId: getMixedUserIdQuery(req.params.userId) }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. SAVE MULTI-VITAL HARDWARE RECORD (Hb, HR, SpO2)
app.post('/api/hb/save', async (req, res) => {
  try {
    const { userId, hbValue, hrValue, spo2Value } = req.body;
    if (!userId || !hbValue) return res.status(400).json({ error: "Missing core data (userId or hbValue)" });

    let status = "Normal";
    if (hbValue < 11.0) status = "Low";
    if (hbValue > 15.0) status = "High";

    const newHbLog = new HbRecord({ 
        userId, 
        hbValue, 
        hrValue: hrValue || null, 
        spo2Value: spo2Value || null, 
        status 
    });
    
    await newHbLog.save();

    res.status(201).json({ message: "Advanced Vitals saved!", record: newHbLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. GET MULTI-VITAL HARDWARE HISTORY
app.get('/api/hb/:userId', async (req, res) => {
  try {
    const records = await HbRecord.find({ userId: getMixedUserIdQuery(req.params.userId) }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// 🌟 13. GENERATE COMBINED ANEMIA + GENERAL VITALS REPORT (SMART MERGE) 🌟
// =====================================================================
app.get('/api/anemia-combo/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const latestHb = await HbRecord.findOne({ userId: getMixedUserIdQuery(userId) }).sort({ date: -1 });
    if (!latestHb) return res.status(400).json({ error: "No Hemoglobin records found." });

    const latestLog = await PeriodLog.findOne({ userId: getMixedUserIdQuery(userId), isMissed: false }).sort({ startDate: -1 });
    const flowIntensity = latestLog ? latestLog.flowIntensity : 'Normal';

    // A. Fetch Original Anemia ML Prediction
    const anemiaResponse = await axios.post('http://127.0.0.1:8000/predict_anemia_combo', {
      hemoglobin: latestHb.hbValue,
      flow_intensity: flowIntensity
    });

    let finalData = anemiaResponse.data;

    // B. Fetch New Hackathon Advanced Vitals Prediction (Sleep Apnea, Anxiety, etc.)
    try {
        const hr = latestHb.hrValue || 75;    // Fallbacks if sensors missed a reading
        const spo2 = latestHb.spo2Value || 98;
        
        const vitalsResponse = await axios.post('http://127.0.0.1:8000/predict_vitals', {
            hb: latestHb.hbValue,
            spo2: spo2,
            hr: hr
        });

        // 🌟 SMART MERGE: ALWAYS APPEND THE RESULT (Even if healthy, to show judges it works!)
        if (vitalsResponse.data) {
            // Upgrade risk level if the new issue is more severe
            if (vitalsResponse.data.risk_level === "Critical") {
                finalData.risk_level = "Critical";
            } else if (vitalsResponse.data.risk_level === "High" && finalData.risk_level !== "Critical") {
                finalData.risk_level = "High";
            }
            
            // Append the new insight with a clear separator
            finalData.combined_insight = finalData.combined_insight + " \n\n🔸 ADVANCED VITALS SCAN: " + vitalsResponse.data.combined_insight;
        }

    } catch (vitalsError) {
        console.log("⚠️ Vitals Model skipped or unavailable:", vitalsError.message);
    }

    res.json(finalData);
  } catch (error) {
    console.error("Combo ML Error:", error.message);
    res.status(500).json({ error: "Failed to generate combined ML report." });
  }
});
// =====================================================================
// 14. REAL-TIME LEAVE MANAGEMENT
// =====================================================================

app.get('/api/leaves', async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().sort({ date: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', async (req, res) => {
  try {
    const { applicantId, applicantName, applicantRole, reason, riskLevel, hbLevel, aiReportSummary, vitalityScore } = req.body;
    
    // Fallback Logic ensuring targetRole is always calculated
    let targetRole = req.body.targetRole;
    if (!targetRole) {
      targetRole = 'dept_head';
      if (applicantRole === 'dept_head' || applicantRole === 'hod') targetRole = 'admin';
      if (applicantRole === 'admin') targetRole = 'state_govt';
      if (applicantRole === 'state_govt') targetRole = 'central_govt';
    }

    const newLeave = new LeaveRequest({
      applicantId, applicantName, applicantRole, targetRole, reason, riskLevel, hbLevel, aiReportSummary, vitalityScore
    });
    
    await newLeave.save();
    res.status(201).json({ success: true, message: "Leave requested successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaves/:role', async (req, res) => {
  try {
    let roleToSearch = req.params.role;
    // Account for both 'hod' and 'dept_head' naming conventions
    let roles = [roleToSearch];
    if (roleToSearch === 'hod' || roleToSearch === 'dept_head') {
        roles = ['hod', 'dept_head'];
    }

    const leaves = await LeaveRequest.find({ targetRole: { $in: roles }, status: 'Pending' }).sort({ date: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leaves/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await LeaveRequest.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true, message: `Leave ${status} successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// 15. REAL-TIME GRIEVANCE / COMPLAINT MANAGEMENT (FIXED FOR ALL SCENARIOS)
// =====================================================================

app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ date: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints', async (req, res) => {
  try {
    // 🌟 SMART FALLBACK: Handles both NEW code and OLD cached browser data seamlessly
    const applicantId = req.body.applicantId || req.body.studentId || "Unknown";
    const type = req.body.type || req.body.issueType || "harassment";
    const description = req.body.description;
    const applicantName = req.body.applicantName || "Student";
    const applicantRole = req.body.applicantRole || "female_user";
    const evidence = req.body.evidence; // 🌟 EXTRACTING EVIDENCE FROM REQUEST
    
    // 🌟 FORCE ROUTING: Calculates targetRole if the frontend failed to send it
    let targetRole = req.body.targetRole;
    if (!targetRole) {
        targetRole = 'dept_head';
        if (applicantRole === 'dept_head' || applicantRole === 'hod') targetRole = 'admin';
        if (applicantRole === 'admin') targetRole = 'state_govt';
        if (applicantRole === 'state_govt') targetRole = 'central_govt';
    }
    
    const newComplaint = new Complaint({ 
      applicantId, 
      applicantName, 
      applicantRole, 
      targetRole, 
      type, 
      description,
      evidence // 🌟 SAVING IMAGE TO DATABASE
    });
    
    await newComplaint.save();
    res.status(201).json({ success: true, message: "Complaint submitted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/complaints/:role', async (req, res) => {
  try {
    let roleToSearch = req.params.role;
    // Handle database variations between 'hod' and 'dept_head'
    let roles = [roleToSearch];
    if (roleToSearch === 'hod' || roleToSearch === 'dept_head') {
        roles = ['hod', 'dept_head'];
    }

    const complaints = await Complaint.find({ targetRole: { $in: roles }, status: 'Pending' }).sort({ date: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/complaints/:id/status', async (req, res) => {
  try {
    const { status, forwardTo } = req.body;
    let updateData = { status };
    
    if (forwardTo) {
      updateData.targetRole = forwardTo;
      updateData.status = 'Pending'; 
    }

    await Complaint.findByIdAndUpdate(req.params.id, updateData);
    res.json({ success: true, message: `Complaint updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));