// Base URL for the main backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Base URL for the ML/Community backend API
const ML_API_BASE_URL = import.meta.env.VITE_ML_API_BASE_URL || "http://localhost:8000";

export const apiGet = async (url) => {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  const response = await fetch(fullUrl);
  if (!response.ok) {
    const error = new Error("GET request failed");
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const apiPostForm = async (url, data) => {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  const response = await fetch(fullUrl, {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    const error = new Error("POST request failed");
    error.status = response.status;
    throw error;
  }

  return response.json();
};

// ML Backend API functions
export const mlApiGet = async (endpoint) => {
  const url = `${ML_API_BASE_URL}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error("ML API GET request failed");
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const mlApiPost = async (endpoint, params) => {
  const url = `${ML_API_BASE_URL}${endpoint}`;
  
  // Convert params to URLSearchParams for POST form data
  const formData = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value.toString());
    }
  });
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || data.message || "ML API POST request failed");
    error.status = response.status;
    error.response = response;
    error.data = data;
    throw error;
  }
  
  return data;
};

// Get community overview data
export const getCommunityOverview = async () => {
  return mlApiGet("/community");
};

// Get user comparison data by client_id
export const getUserComparison = async (userId) => {
  return mlApiGet(`/compare/${userId}`);
};

// Get user comparison data by financial profile
export const getUserComparisonByProfile = async (profileData) => {
  return mlApiPost("/compare-by-profile", profileData);
};
