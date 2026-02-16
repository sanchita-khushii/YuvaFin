// src/pages/Onboarding.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    salary: "",
    monthlyExpenditure: "",
    savings: "",
    bills: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, bills: e.target.files[0] });
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("salary", formData.salary);
      formDataToSend.append("monthlyExpenditure", formData.monthlyExpenditure);
      formDataToSend.append("savings", formData.savings);
      if (formData.bills) {
        formDataToSend.append("bills", formData.bills);
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        body: formDataToSend,
      });
      const data = await res.json();
      console.log("Onboarding completed:", data);
    } catch (err) {
      console.error("Onboarding error:", err);
    }
    
    // Redirect to dashboard after completing onboarding
    navigate("/dashboard");
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-purple-900 to-black opacity-60"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 15, repeat: Infinity }}
        style={{ backgroundSize: "200% 200%" }}
      />

      {/* Animated Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
        animate={{
          y: [0, 50, 0],
          x: [0, 30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
        animate={{
          y: [0, -50, 0],
          x: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 4 }}
      />

      {/* Onboarding Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white">Welcome to YuvaFin</h1>
              <p className="text-gray-300 text-sm mt-2">
                Let's begin with some basic questions
              </p>
              <motion.div className="flex justify-center gap-2 mt-4">
                {[1, 2, 3, 4].map((s) => (
                  <motion.div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s <= step ? "bg-indigo-500 w-6" : "bg-gray-600 w-2"
                    }`}
                    animate={{ scale: s === step ? 1.2 : 1 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </motion.div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Salary */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.4 }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2">
                          What's your annual salary?
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-gray-400 text-lg">₹</span>
                          <Input
                            name="salary"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g., 500000"
                            value={formData.salary}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setFormData({ ...formData, salary: value });
                            }}
                            className="w-full bg-white/20 text-white placeholder:text-gray-400 pl-8"
                          />
                        </div>
                        <p className="text-gray-400 text-xs mt-2">
                          This helps us understand your financial capacity
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 2: Monthly Expenditure */}
              <AnimatePresence mode="wait">
                {step === 2 && (
                  <motion.div
                    key="step2"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.4 }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2">
                          What's your monthly expenditure (approx)?
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-gray-400 text-lg">₹</span>
                          <Input
                            name="monthlyExpenditure"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g., 25000"
                            value={formData.monthlyExpenditure}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setFormData({ ...formData, monthlyExpenditure: value });
                            }}
                            className="w-full bg-white/20 text-white placeholder:text-gray-400 pl-8"
                          />
                        </div>
                        <p className="text-gray-400 text-xs mt-2">
                          Include rent, food, utilities, and other monthly expenses
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3: Savings */}
              <AnimatePresence mode="wait">
                {step === 3 && (
                  <motion.div
                    key="step3"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.4 }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2">
                          How much have you saved so far?
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-gray-400 text-lg">₹</span>
                          <Input
                            name="savings"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g., 100000"
                            value={formData.savings}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setFormData({ ...formData, savings: value });
                            }}
                            className="w-full bg-white/20 text-white placeholder:text-gray-400 pl-8"
                          />
                        </div>
                        <p className="text-gray-400 text-xs mt-2">
                          Your current savings across all accounts
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 4: Bill Upload */}
              <AnimatePresence mode="wait">
                {step === 4 && (
                  <motion.div
                    key="step4"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.4 }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2">
                          Upload your bills for detailed analysis
                        </label>
                        <motion.div
                          className="border-2 border-dashed border-indigo-400 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <input
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            id="bill-upload"
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                          <label htmlFor="bill-upload" className="cursor-pointer block">
                            <motion.div
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="inline-block"
                            >
                              <svg
                                className="w-8 h-8 text-indigo-400 mx-auto mb-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                            </motion.div>
                            <p className="text-gray-300 text-sm font-semibold">
                              {formData.bills ? formData.bills.name : "Click or drag to upload"}
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              PDF, JPG, PNG (optional)
                            </p>
                          </label>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-8 pt-4">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-xl py-2 transition-colors"
                  >
                    Previous
                  </Button>
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2 hover:scale-105 transition-transform"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2 hover:scale-105 transition-transform"
                  >
                    Complete Setup
                  </Button>
                )}
              </div>
            </form>

            {/* Step Indicator Text */}
            <div className="text-center mt-6">
              <p className="text-gray-400 text-xs">
                Step {step} of 4
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -50px); }
          50% { transform: translate(-20px, 20px); }
          75% { transform: translate(50px, 50px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
}
