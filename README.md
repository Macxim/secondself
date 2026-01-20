# Second Self 🤖

Second Self is a sophisticated AI-driven sales automation and persona-matching system designed for coaches and digital entrepreneurs. It integrates seamlessly with Facebook Messenger to handle lead nurturing, sales conversations, and automated follow-ups with a personalized, human-like touch.

## 🚀 Key Capabilities

### 1. AI Persona Matching (Style Training)
Second Self doesn't just send generic bot replies. It features a **Style Trainer** that learns your unique voice. By analyzing your past conversations or content, it creates a "Style Profile" that the AI uses to match your tone, vocabulary, and formatting, ensuring every interaction feels like it's coming directly from you.

### 2. Automated Sales Flow
The system manages a complete sales funnel based on the **Peaceful Clients Gameplan** script. It guides leads through a structured journey:
- **Permission-based Outreach**: Initial messages tailored to profile engagers, group members, or event attendees.
- **Resource Delivery**: Automatically sends Offer Docs when requested.
- **Conversion**: Handles "GAMEPLAN" requests by delivering payment links and booking instructions.
- **Post-Purchase Care**: Reminds clients to book calls and complete intake forms.

### 3. "Peaceful" Automated Follow-ups
Never lose a lead to manual tracking. Second Self implements a multi-level nurturing sequence:
- **Initial DM Follow-ups**: 48h, 96h, and 144h intervals.
- **Doc/Link follow-ups**: 24h, 48h, and 72h intervals.
- **Loop Closure**: Automatically closes "loops" gracefully if a lead isn't the right fit at the moment, maintaining brand reputation.

### 4. Smart "Safe" Replies
The AI is equipped with scripted "Safe Replies" for common questions (e.g., "How much is it?", "What do I get?"). This ensures accuracy on critical details while allowing the AI to handle the natural flow of conversation for everything else.

### 5. Facebook Messenger Integration
A professional-grade integration that includes:
- **Typing Indicators**: Mimics human behavior.
- **Message Splitting**: Handles long AI responses to respect platform limits and improve readability.
- **Profile Awareness**: Greets users by name and remembers their context.

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4o API (via `openai` library)
- **Messaging**: Facebook Graph API (v21.0)
- **Storage**: JSON-based file persistence for user flows and style profiles.
- **Dev Tools**: Nodemon for local development.

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/secondself.git
   cd secondself
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   OPENAI_API_KEY=your_openai_key
   FACEBOOK_PAGE_ACCESS_TOKEN=your_facebook_token
   FACEBOOK_VERIFY_TOKEN=your_custom_verify_token
   ```

4. **Run the server**:
   ```bash
   npm run dev
   ```

## 🔌 API Endpoints

- `POST /webhook`: Facebook Messenger webhook endpoint.
- `POST /flow/start`: Initialize a new sales flow for a user.
- `POST /flow/process-followups`: Trigger the automated follow-up engine.
- `POST /style/train`: Train the AI persona with new examples.
- `GET /dashboard.html`: View the live monitoring dashboard.

## 📁 Project Structure

- `src/services/`: Core logic (Facebook, OpenAI, Sales Flow, Style Management).
- `src/routes/`: API endpoint definitions.
- `data/`: Local storage for flows and trained styles.
- `public/`: Dashboard UI.

## ⚖️ License

ISC License.
