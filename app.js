// Description: This file contains the client-side JavaScript code for the chat interface.

const API_KEY = config.apiKey; // Your API Key
const API_ENDPOINT = config.apiEndpt; // API endpoint URL

// Conversation history starts with an instruction as a "user" message
let conversationHistory = [
    { role: "user", text: "You are a friendly and supportive friend. Keep responses warm and engaging." }
];

async function testConnection() {
    try {
        addMessageToChat('system', 'Testing API connection...');
        
        const requestBody = {
            "model": "gemini-2.0-flash",
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": "Hello, please respond with a simple greeting."
                        }
                    ]
                }
            ]
        };

        const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error Details:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Success:', data);
        
        // Extract the response text
        const aiResponse = data.candidates[0].content.parts[0].text;
        addMessageToChat('ai', aiResponse);
        addMessageToChat('system', 'Connection successful!');

    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('system', 'Connection failed: ' + error.message);
    }
}


function addMessageToChat(type, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    messageDiv.innerHTML = formatResponse(message);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Ensure correct roles: 'user' or 'model'
    let role = type === 'user' ? 'user' : 'model';
    conversationHistory.push({ role, text: message });

    // Keep only the last 15 messages for context
    if (conversationHistory.length > 15) {
        conversationHistory.splice(1, 1);
    }

    saveChatHistory();
}

function formatResponse(responseText) {
    return responseText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert **bold** to <strong>
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Convert *italic* to <em>
        .replace(/\n/g, '<br>'); // Convert line breaks to <br>
}

function showTypingIndicator() {
    const chatMessages = document.getElementById("chatMessages");

    // Remove any existing typing indicator before adding a new one
    const existingIndicator = document.getElementById("typingIndicator");
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Create a new typing indicator div
    const typingIndicator = document.createElement("div");
    typingIndicator.id = "typingIndicator";
    typingIndicator.className = "typing-indicator";
    typingIndicator.innerHTML = '<span></span><span></span><span></span>'; // Add dots

    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingIndicator) {
        typingIndicator.remove(); // Remove it from chat flow
    }
}


async function sendMessage() {
    const userInput = document.getElementById('userInput').value;
    if (!userInput.trim()) return;

    addMessageToChat('user', userInput);
    document.getElementById('userInput').value = '';

    showTypingIndicator();


    try {
        const requestBody = {
            "contents": conversationHistory.map(msg => ({
                "role": msg.role,  // Ensuring only 'user' or 'model'
                "parts": [{ "text": msg.text }]
            }))
        };

        const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error Details:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        hideTypingIndicator();

        const aiResponse = formatResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received");
        addMessageToChat('model', aiResponse);  // Ensure correct role

    } catch (error) {
        console.error('Detailed Error:', error);
        addMessageToChat('system', 'Error: Could not get response');
    }
}

function saveChatHistory() {
    const messages = Array.from(document.querySelectorAll(".message")).map(msg => ({
        text: msg.textContent,
        sender: msg.classList.contains("user-message") ? "user" : "ai"
    }));
    localStorage.setItem("chatHistory", JSON.stringify(messages));
}

function loadChatHistory() {
    const storedHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

    if (storedHistory.length === 0) {
        const defaultGreeting = "Hey friend! 😊 I'm MitrAI—here to help and chat. What's up?";
        addMessageToChat("model", defaultGreeting);

        // Save it to localStorage immediately so it persists
        localStorage.setItem("chatHistory", JSON.stringify([{ sender: "model", text: defaultGreeting }]));
    } else {
        storedHistory.forEach(({ sender, text }) => {
            addMessageToChat(sender, text);
        });
    }

    console.log("Chat history loaded:", storedHistory);
}

window.onload = function () {
    loadChatHistory();
};

document.getElementById("newChatBtn").addEventListener("click", function () {
    localStorage.removeItem("chatHistory");  // Clear stored messages
    document.getElementById("chatMessages").innerHTML = "";  // Clear chat UI
    loadChatHistory();

});


// Handle Enter key
document.getElementById('userInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            // Shift + Enter: Insert a new line
            e.preventDefault();
            const cursorPosition = this.selectionStart;
            this.value = this.value.substring(0, cursorPosition) + '\n' + this.value.substring(cursorPosition);
            this.selectionStart = this.selectionEnd = cursorPosition + 1;
        } else {
            // Enter alone: Send the message
            e.preventDefault();
            sendMessage();
        }
    }
});

