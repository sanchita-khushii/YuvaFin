// src/pages/Login.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    age: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";

    // Attempt API call but redirect regardless
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.error("Auth error:", err);
    }

    // Navigate based on login/signup after form submission
    if (isLogin) {
      navigate("/dashboard");
    } else {
      navigate("/onboarding");
    }
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

      {/* Login/Signup Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white">YuvaFin</h1>
              <p className="text-gray-300 text-sm mt-2">
                {isLogin
                  ? "Welcome back. Build your financial freedom."
                  : "Start your journey to financial independence."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (Signup Only) */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <Input
                      name="fullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/20 text-white placeholder:text-gray-300"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Age (Signup Only) */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <Input
                      name="age"
                      type="number"
                      placeholder="Age"
                      value={formData.age}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/20 text-white placeholder:text-gray-300"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-white/20 text-white placeholder:text-gray-300"
              />

              {/* Password */}
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-white/20 text-white placeholder:text-gray-300"
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-lg py-2 hover:scale-105 transition-transform"
              >
                {isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            {/* Toggle Login/Signup */}
            <div className="mt-6 text-center">
              <p className="text-gray-300 text-sm">
                {isLogin ? "New to YuvaFin?" : "Already have an account?"}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {isLogin ? "Sign Up" : "Login"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
