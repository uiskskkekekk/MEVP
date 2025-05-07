import axios from "axios";

const API_URL = "http://localhost:5050/api";

export const sendLLMQuery = async (query) => {
  try {
    const response = await axios.post(`${API_URL}/llm`, { query });
    return response.data;
  } catch (error) {
    console.error("Error in LLM service:", error);
    throw error;
  }
};
