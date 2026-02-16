// src/pages/Dashboard.jsx
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import FinancialAdvisorChatbot from "../components/FinancialAdvisorChatbot";
import { apiGet, apiPostForm } from "../apiClient";

// 3D Pie Chart Component
function PieChart3D({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;
    const depth = 20;

    ctx.clearRect(0, 0, width, height);

    // Calculate total
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Colors for the pie slices
    const colors = [
      "#8b5cf6",
      "#6366f1",
      "#ec4899",
      "#f59e0b",
      "#10b981",
      "#06b6d4",
    ];

    let currentAngle = -Math.PI / 2;

    // Draw 3D effect (depth)
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.arc(centerX, centerY + depth, radius, currentAngle, currentAngle + sliceAngle);
      ctx.lineTo(centerX, centerY + depth);
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Reset angle for drawing front face
    currentAngle = -Math.PI / 2;

    // Draw pie slices
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const color = colors[index % colors.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw labels
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.65);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.65);

      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const percentage = ((item.value / total) * 100).toFixed(1);
      ctx.fillText(percentage + "%", labelX, labelY);

      currentAngle += sliceAngle;
    });
  }, [data]);

  return <canvas ref={canvasRef} width={400} height={320} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [uploadedBills, setUploadedBills] = useState([]);
  const [uploadedSalary, setUploadedSalary] = useState([]);
  const billsFileInputRef = useRef(null);
  const salaryFileInputRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [billUploading, setBillUploading] = useState(false);
  const [billMessage, setBillMessage] = useState("");
  const [billError, setBillError] = useState("");
  const [salaryUploading, setSalaryUploading] = useState(false);
  const [salaryMessage, setSalaryMessage] = useState("");
  const [salaryError, setSalaryError] = useState("");
  const [wellness, setWellness] = useState(null);
  const [wellnessLoading, setWellnessLoading] = useState(false);
  const [wellnessError, setWellnessError] = useState("");

  // Sample expense data fallback (used if backend has no data yet)
  const defaultExpenseData = [
    { label: "Food & Dining", value: 450 },
    { label: "Transportation", value: 300 },
    { label: "Entertainment", value: 200 },
    { label: "Utilities", value: 250 },
    { label: "Shopping", value: 350 },
    { label: "Other", value: 150 },
  ];

  const expenseData =
    summary && summary.category_breakdown && summary.category_breakdown.length
      ? summary.category_breakdown.map((item) => ({
          label: item.category,
          value: item.amount,
        }))
      : defaultExpenseData;

  const totalExpenses = summary
    ? summary.total_expense
    : expenseData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value) =>
    typeof value === "number"
      ? `₹${value.toLocaleString("en-IN")}`
      : "₹—";

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const [summaryData, userData] = await Promise.all([
          apiGet("/api/dashboard/summary"),
          apiGet("/api/auth/me"),
        ]);
        setSummary(summaryData);
        setUser(userData);
      } catch (err) {
        console.error("Dashboard load error:", err);
        if (err.status === 401) {
          window.localStorage.removeItem("authToken");
          navigate("/login");
          return;
        }
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  // Load financial wellness analysis when the Wellness tab is opened
  useEffect(() => {
    const loadWellness = async () => {
      setWellnessLoading(true);
      setWellnessError("");
      try {
        const data = await apiGet("/api/wellness/analysis");
        if (data && data.error) {
          // Logical error from backend (e.g. "Please upload salary first.")
          setWellness(null);
          setWellnessError(data.error);
        } else {
          setWellness(data);
        }
      } catch (err) {
        console.error("Wellness analysis load error:", err);
        if (err.status === 401) {
          window.localStorage.removeItem("authToken");
          navigate("/login");
          return;
        }
        setWellnessError(
          err.message || "Failed to load financial wellness analysis."
        );
      } finally {
        setWellnessLoading(false);
      }
    };

    if (activeTab === "wellness" && !wellness && !wellnessLoading) {
      loadWellness();
    }
  }, [activeTab, wellness, wellnessLoading, navigate]);

  const handleLogout = () => {
    window.localStorage.removeItem("authToken");
    navigate("/login");
  };

  // Handle bill uploads - sends images to /api/expenses/upload-bill (OCR + DB save)
  const handleBillUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setBillError("");
    setBillMessage("");
    setBillUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await apiPostForm("/api/expenses/upload-bill", formData);

      const newPreviews = files.map((file) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        preview: URL.createObjectURL(file),
        size: (file.size / 1024).toFixed(2),
      }));
      setUploadedBills((prev) => [...prev, ...newPreviews]);

      setBillMessage(
        `Processed ${response.expenses.length} bill(s) and saved to your account.`
      );

      // Refresh dashboard summary so charts reflect new expenses
      try {
        const summaryData = await apiGet("/api/dashboard/summary");
        setSummary(summaryData);
      } catch (innerErr) {
        console.error("Failed to refresh summary after bill upload:", innerErr);
      }
    } catch (err) {
      console.error("Bill upload error:", err);
      if (err.status === 401) {
        window.localStorage.removeItem("authToken");
        navigate("/login");
        return;
      }
      setBillError(
        err.message ||
          "Could not upload bills. Please try again with a clear image."
      );
    } finally {
      setBillUploading(false);
      if (billsFileInputRef.current) {
        billsFileInputRef.current.value = "";
      }
    }
  };

  // Handle salary slip uploads - sends image to /api/expenses/upload-salary (OCR + update income)
  const handleSalaryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const file = files[0];
    if (!file) return;

    setSalaryError("");
    setSalaryMessage("");
    setSalaryUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiPostForm(
        "/api/expenses/upload-salary",
        formData
      );

      const fileData = {
        id: Date.now() + Math.random(),
        name: file.name,
        preview: URL.createObjectURL(file),
        size: (file.size / 1024).toFixed(2),
      };
      setUploadedSalary((prev) => [...prev, fileData]);

      setSalaryMessage(response.message || "Salary slip processed successfully.");

      // Refresh dashboard summary so income/savings reflect new salary
      try {
        const summaryData = await apiGet("/api/dashboard/summary");
        setSummary(summaryData);
      } catch (innerErr) {
        console.error(
          "Failed to refresh summary after salary upload:",
          innerErr
        );
      }
    } catch (err) {
      console.error("Salary upload error:", err);
      if (err.status === 401) {
        window.localStorage.removeItem("authToken");
        navigate("/login");
        return;
      }
      setSalaryError(
        err.message ||
          "Could not upload salary slip. Please try again with a clear image."
      );
    } finally {
      setSalaryUploading(false);
      if (salaryFileInputRef.current) {
        salaryFileInputRef.current.value = "";
      }
    }
  };

  const removeBill = (id) => {
    setUploadedBills(uploadedBills.filter((bill) => bill.id !== id));
  };

  const removeSalary = (id) => {
    setUploadedSalary(uploadedSalary.filter((salary) => salary.id !== id));
  };

  // Tab configuration
  const tabs = [
    { id: "home", name: "Home" },
    { id: "wellness", name: "Financial Wellness" },
    { id: "bills", name: "Upload Bills" },
    { id: "salary", name: "Upload Salary Slip" },
    { id: "community", name: "Community" },
    { id: "profile", name: "User Profile" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-purple-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button
            onClick={handleLogout}
            className="bg-white hover:bg-gray-200 text-black px-6 py-2 rounded-lg transition-colors"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-purple-500/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 font-semibold transition-all duration-300 relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-purple-300"
                    : "text-gray-400 hover:text-purple-200"
                }`}
              >
                {tab.name}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 py-12"
      >
        {loading && (
          <p className="text-center text-gray-300 mb-6">
            Loading your dashboard...
          </p>
        )}
        {error && (
          <p className="text-center text-red-400 mb-6">{error}</p>
        )}
        {/* Home Tab */}
        {activeTab === "home" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Income Overview */}
            <div className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-6">Income Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-6 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <p className="text-gray-400 text-sm mb-2">Monthly Income</p>
                  <p className="text-3xl font-bold text-green-400">
                    {formatCurrency(
                      summary?.income ?? user?.monthly_income ?? null
                    )}
                  </p>
                </motion.div>

                <motion.div
                  className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-6 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <p className="text-gray-400 text-sm mb-2">
                    Current Month Expenses
                  </p>
                  <p className="text-3xl font-bold text-blue-400">
                    {formatCurrency(summary?.total_expense ?? null)}
                  </p>
                </motion.div>

                <motion.div
                  className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-6 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <p className="text-gray-400 text-sm mb-2">
                    Current Month Savings
                  </p>
                  <p className="text-3xl font-bold text-purple-400">
                    {formatCurrency(summary?.savings ?? null)}
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Expense Analysis with 3D Pie Chart */}
            <div className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-6">Expense Analysis</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex justify-center items-center bg-purple-900/20 border border-purple-500/20 rounded-lg p-4"
                >
                  <PieChart3D data={expenseData} />
                </motion.div>

                {/* Expense Breakdown */}
                <div>
                  <div className="mb-6">
                    <p className="text-gray-400 text-sm mb-2">Total Expenses</p>
                    <p className="text-4xl font-bold text-red-400">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {expenseData.map((item, index) => {
                      const percentage = ((item.value / totalExpenses) * 100).toFixed(1);
                      const colors = [
                        "bg-purple-500",
                        "bg-indigo-500",
                        "bg-pink-500",
                        "bg-amber-500",
                        "bg-emerald-500",
                        "bg-cyan-500",
                      ];

                      return (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  colors[index % colors.length]
                                }`}
                              ></div>
                              <span className="text-gray-300">{item.label}</span>
                            </div>
                            <span className="font-semibold">₹{item.value}</span>
                          </div>
                          <div className="w-full bg-purple-900/30 rounded-full h-2 mb-3">
                            <motion.div
                              className={`h-2 rounded-full ${
                                colors[index % colors.length]
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                            ></motion.div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Progress */}
            <div className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-6">Savings Progress</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Stats */}
                <div className="space-y-4">
                  <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-2">Total Savings</p>
                    <p className="text-3xl font-bold text-green-400">₹25,000</p>
                    <p className="text-gray-400 text-xs mt-1">Updated today</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">Savings Rate</p>
                      <p className="text-2xl font-bold text-green-400">18%</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">Monthly Target</p>
                      <p className="text-2xl font-bold text-blue-400">₹9,000</p>
                    </div>
                  </div>

                  <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-2">Target Progress</p>
                    <div className="w-full bg-purple-900/50 rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-500"
                        initial={{ width: 0 }}
                        animate={{ width: "72%" }}
                        transition={{ duration: 1, delay: 0.3 }}
                      ></motion.div>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">₹6,480 of ₹9,000</p>
                  </div>
                </div>

                {/* Right Side - Bar Chart */}
                <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-6">
                  <p className="text-sm font-semibold mb-6 text-gray-300">Monthly Savings Last 6 Months</p>
                  <div className="flex items-end justify-between gap-2 h-48">
                    {[
                      { month: "Jan", amount: Math.floor(Math.random() * 3000 + 2000), percentage: Math.floor(Math.random() * 40 + 20) },
                      { month: "Feb", amount: Math.floor(Math.random() * 3000 + 2000), percentage: Math.floor(Math.random() * 50 + 30) },
                      { month: "Mar", amount: Math.floor(Math.random() * 3000 + 2000), percentage: Math.floor(Math.random() * 60 + 40) },
                      { month: "Apr", amount: Math.floor(Math.random() * 3000 + 2000), percentage: Math.floor(Math.random() * 70 + 50) },
                      { month: "May", amount: Math.floor(Math.random() * 3000 + 2000), percentage: Math.floor(Math.random() * 80 + 60) },
                      { month: "Jun", amount: Math.floor(Math.random() * 3000 + 2000), percentage: Math.floor(Math.random() * 90 + 70) },
                    ].map((data, index) => (
                      <motion.div
                        key={data.month}
                        className="flex flex-col items-center flex-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * (index + 1) }}
                      >
                        <motion.div
                          className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg relative group"
                          style={{ height: `${Math.min(data.percentage, 100)}%` }}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.min(data.percentage, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.15 * index }}
                          whileHover={{ boxShadow: "0 0 20px rgba(34, 197, 94, 0.5)" }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            ₹{data.amount}
                          </div>
                        </motion.div>
                        <p className="text-xs text-gray-400 mt-2">{data.month}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Financial Wellness Tab */}
        {activeTab === "wellness" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {wellnessLoading && (
              <p className="text-gray-300 text-sm mb-4">
                Analyzing your financial wellness based on your recent income and expenses...
              </p>
            )}
            {wellnessError && (
              <p className="text-red-400 text-sm mb-4">{wellnessError}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <motion.div
                className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-4">Savings Rate</h2>
                <p className="text-gray-300 text-sm">
                  {wellness
                    ? `Overall score: ${
                        wellness.financial_wellness_score ?? "—"
                      }/100 (${wellness.level || "—"})`
                    : "Track how much of your income you're saving"}
                </p>
                {wellness && (
                  <p className="text-xs text-gray-400 mt-3">
                    Stress index:{" "}
                    <span className="font-semibold">
                      {wellness.financial_stress_index || "—"}
                    </span>{" "}
                    • Risk profile:{" "}
                    <span className="font-semibold">
                      {wellness.risk_profile || "—"}
                    </span>
                  </p>
                )}
              </motion.div>

              {/* Card 2 */}
              <motion.div
                className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-4">Budget Health</h2>
                <p className="text-gray-300 text-sm mb-3">
                  {wellness
                    ? "Top budget and spending risks identified from your recent activity:"
                    : "Monitor your spending against your budget"}
                </p>
                {wellness && (
                  <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                    {(wellness.identified_risks || [])
                      .slice(0, 3)
                      .map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    {(!wellness.identified_risks ||
                      wellness.identified_risks.length === 0) && (
                      <li>No major risks detected from current data.</li>
                    )}
                  </ul>
                )}
              </motion.div>

              {/* Card 3 */}
              <motion.div
                className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-4">Financial Goals</h2>
                <p className="text-gray-300 text-sm mb-3">
                  {wellness
                    ? "Personalized, measurable actions to improve and scale your finances:"
                    : "Set and track your financial objectives"}
                </p>
                {wellness && (
                  <div className="space-y-3 text-xs text-gray-400">
                    <div>
                      <p className="font-semibold text-purple-200 mb-1">
                        Next 30 days
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {(wellness.short_term_action_plan || [])
                          .slice(0, 3)
                          .map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-purple-200 mb-1">
                        1–5 year outlook
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {(wellness.long_term_action_plan || [])
                          .slice(0, 3)
                          .map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Upload Bills Tab */}
        {activeTab === "bills" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-6">Upload Bills</h2>

              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-purple-500/50 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 transition-colors mb-8"
                onClick={() => billsFileInputRef.current?.click()}
              >
                <div className="mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold mb-2">Upload Bill Photos</p>
                <p className="text-gray-400 text-sm">
                  Click to select files or drag and drop
                </p>
                <input
                  ref={billsFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleBillUpload}
                  className="hidden"
                />
              </div>

              {billMessage && (
                <p className="text-sm text-green-400 mb-4">{billMessage}</p>
              )}
              {billError && (
                <p className="text-sm text-red-400 mb-4">{billError}</p>
              )}

              {/* Uploaded Bills Preview */}
              {uploadedBills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Uploaded Bills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedBills.map((bill) => (
                      <motion.div
                        key={bill.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-purple-900/30 border border-purple-500/30 rounded-lg overflow-hidden"
                      >
                        <img
                          src={bill.preview}
                          alt={bill.name}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-4">
                          <p className="text-sm font-semibold truncate mb-2">
                            {bill.name}
                          </p>
                          <p className="text-xs text-gray-400 mb-3">
                            {bill.size} KB
                          </p>
                          <button
                            onClick={() => removeBill(bill.id)}
                            className="w-full bg-red-600/80 hover:bg-red-700 text-white text-sm py-2 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Upload Salary Slip Tab */}
        {activeTab === "salary" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-6">Upload Salary Slip</h2>

              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-purple-500/50 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 transition-colors mb-8"
                onClick={() => salaryFileInputRef.current?.click()}
              >
                <div className="mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold mb-2">Upload Salary Slip Photos</p>
                <p className="text-gray-400 text-sm">
                  Click to select files or drag and drop
                </p>
                <input
                  ref={salaryFileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSalaryUpload}
                  className="hidden"
                />
              </div>

              {salaryMessage && (
                <p className="text-sm text-green-400 mb-4">{salaryMessage}</p>
              )}
              {salaryError && (
                <p className="text-sm text-red-400 mb-4">{salaryError}</p>
              )}

              {/* Uploaded Salary Slips Preview */}
              {uploadedSalary.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Uploaded Salary Slips</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedSalary.map((salary) => (
                      <motion.div
                        key={salary.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-purple-900/30 border border-purple-500/30 rounded-lg overflow-hidden"
                      >
                        <img
                          src={salary.preview}
                          alt={salary.name}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-4">
                          <p className="text-sm font-semibold truncate mb-2">
                            {salary.name}
                          </p>
                          <p className="text-xs text-gray-400 mb-3">
                            {salary.size} KB
                          </p>
                          <button
                            onClick={() => removeSalary(salary.id)}
                            className="w-full bg-red-600/80 hover:bg-red-700 text-white text-sm py-2 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Community Tab */}
        {activeTab === "community" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Comparison Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overall Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm"
              >
                <h2 className="text-2xl font-semibold mb-8">Your Performance vs Community</h2>

                <div className="space-y-6">
                  {/* Savings Rate Comparison */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-green-400">Savings Rate</p>
                        <p className="text-sm text-gray-400">You're in top 18%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">18%</p>
                        <p className="text-xs text-gray-400">vs 8% avg</p>
                      </div>
                    </div>
                    <div className="w-full bg-purple-900/30 rounded-full h-3">
                      <motion.div
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                        initial={{ width: 0 }}
                        animate={{ width: "82%" }}
                        transition={{ duration: 1, delay: 0.2 }}
                      ></motion.div>
                    </div>
                  </motion.div>

                  {/* Expense Control Comparison */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-blue-400">Expense Control</p>
                        <p className="text-sm text-gray-400">You're in top 45%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-400">45%</p>
                        <p className="text-xs text-gray-400">vs 50% avg</p>
                      </div>
                    </div>
                    <div className="w-full bg-purple-900/30 rounded-full h-3">
                      <motion.div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: "90%" }}
                        transition={{ duration: 1, delay: 0.3 }}
                      ></motion.div>
                    </div>
                  </motion.div>

                  {/* Budget Hit Rate */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-purple-400">Budget Adherence</p>
                        <p className="text-sm text-gray-400">You're in top 72%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-400">72%</p>
                        <p className="text-xs text-gray-400">vs 65% avg</p>
                      </div>
                    </div>
                    <div className="w-full bg-purple-900/30 rounded-full h-3">
                      <motion.div
                        className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-400"
                        initial={{ width: 0 }}
                        animate={{ width: "72%" }}
                        transition={{ duration: 1, delay: 0.4 }}
                      ></motion.div>
                    </div>
                  </motion.div>

                  {/* Financial Health Score */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-orange-400">Financial Health Score</p>
                        <p className="text-sm text-gray-400">You're in top 63%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-400">7.8/10</p>
                        <p className="text-xs text-gray-400">vs 6.2/10 avg</p>
                      </div>
                    </div>
                    <div className="w-full bg-purple-900/30 rounded-full h-3">
                      <motion.div
                        className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400"
                        initial={{ width: 0 }}
                        animate={{ width: "78%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                      ></motion.div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Percentile Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <h3 className="text-xl font-semibold mb-8">Your Percentile Rank</h3>
                
                {/* Circular Progress */}
                <div className="relative w-48 h-48 mb-8">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {/* Background circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="rgba(139, 92, 246, 0.2)"
                      strokeWidth="8"
                    />
                    {/* Progress circle */}
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      strokeDasharray="565"
                      initial={{ strokeDashoffset: 565 }}
                      animate={{ strokeDashoffset: 113 }}
                      transition={{ duration: 1.5, delay: 0.3 }}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-green-400">63%</p>
                    <p className="text-sm text-gray-400">Percentile</p>
                  </div>
                </div>

                <p className="text-center text-gray-300">
                  You're performing better than <span className="font-bold text-green-400">63% of users</span> in your financial health and savings habits!
                </p>
              </motion.div>
            </div>

            {/* Category Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm"
            >
              <h3 className="text-2xl font-semibold mb-8">Category Comparison</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: "Food & Dining", your: 450, avg: 520, better: true },
                  { name: "Transportation", your: 300, avg: 380, better: true },
                  { name: "Entertainment", your: 200, avg: 290, better: true },
                  { name: "Shopping", your: 350, avg: 420, better: true },
                ].map((category, index) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4"
                  >
                    <p className="font-semibold text-sm mb-3">{category.name}</p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-400">You</span>
                        <span className="font-semibold">₹{category.your}</span>
                      </div>
                      <div className="w-full bg-purple-900/50 rounded-full h-1.5">
                        <motion.div
                          className="h-1.5 rounded-full bg-green-500"
                          initial={{ width: 0 }}
                          animate={{ width: "70%" }}
                          transition={{ duration: 0.8, delay: 0.1 * index }}
                        ></motion.div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Avg</span>
                        <span className="font-semibold">₹{category.avg}</span>
                      </div>
                      <div className="w-full bg-purple-900/50 rounded-full h-1.5">
                        <motion.div
                          className="h-1.5 rounded-full bg-gray-500"
                          initial={{ width: 0 }}
                          animate={{ width: "85%" }}
                          transition={{ duration: 0.8, delay: 0.15 * index }}
                        ></motion.div>
                      </div>
                    </div>

                    <div className={`text-center text-xs font-semibold py-2 px-2 rounded ${
                      category.better
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      You save ₹{category.avg - category.your} per month
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm"
            >
              <h3 className="text-2xl font-semibold mb-6">Your Achievements</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: "🏆", title: "Budget Master", desc: "Stayed within budget for 3 months" },
                  { icon: "💚", title: "Saver", desc: "Saved 15%+ of your income" },
                  { icon: "📈", title: "Consistent", desc: "Logged expenses for 30 days" },
                  { icon: "⭐", title: "Rising Star", desc: "Improved financial health by 20%" },
                ].map((achievement, index) => (
                  <motion.div
                    key={achievement.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4 text-center hover:border-purple-400 transition-colors"
                  >
                    <p className="text-3xl mb-2">{achievement.icon}</p>
                    <p className="font-semibold text-sm mb-1">{achievement.title}</p>
                    <p className="text-xs text-gray-400">{achievement.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* User Profile Tab */}
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center"
          >
            <div className="bg-gradient-to-br from-purple-800/40 to-indigo-800/40 border border-purple-500/30 rounded-xl p-8 backdrop-blur-sm max-w-2xl w-full">
              <h2 className="text-2xl font-semibold mb-6">User Profile</h2>

              <div className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user?.full_name || "User Name"}
                    </h3>
                    <p className="text-gray-400">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>
                </div>

                {/* Sample Profile Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      defaultValue={user?.full_name || ""}
                      className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      defaultValue={user?.email || ""}
                      className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Phone</label>
                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors">
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Financial Advisor Chatbot */}
      <FinancialAdvisorChatbot />
    </div>
  );
}
