// src/pages/Dashboard.jsx
import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import FinancialAdvisorChatbot from "../components/FinancialAdvisorChatbot";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">YuvaFin Dashboard</h1>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 py-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder Card 1 */}
          <motion.div
            className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 rounded-xl p-8"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4">Income Overview</h2>
            <p className="text-gray-400 text-sm">
              Dashboard content will be added here
            </p>
          </motion.div>

          {/* Placeholder Card 2 */}
          <motion.div
            className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 rounded-xl p-8"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4">Expenses Analysis</h2>
            <p className="text-gray-400 text-sm">
              Dashboard content will be added here
            </p>
          </motion.div>

          {/* Placeholder Card 3 */}
          <motion.div
            className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 rounded-xl p-8"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4">Savings Goals</h2>
            <p className="text-gray-400 text-sm">
              Dashboard content will be added here
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-white/10 rounded-xl p-8"
        >
          <h2 className="text-2xl font-semibold mb-4">Ready to design the dashboard?</h2>
          <p className="text-gray-300">
            Let me know how you'd like the dashboard to look and what information should be displayed!
          </p>
        </motion.div>
      </motion.div>

      {/* Financial Advisor Chatbot */}
      <FinancialAdvisorChatbot />
    </div>
  );
}
