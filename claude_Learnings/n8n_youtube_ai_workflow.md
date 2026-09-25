---
name: n8n YouTube AI Video Workflow
description: Structured markdown documentation for an n8n workflow that automates script generation, video creation, and YouTube upload using AI services.
type: reference
---

# n8n Workflow – AI‑generated YouTube Videos

This document describes a ready‑to‑import n8n workflow that automates the creation and publishing of YouTube videos using AI. The workflow follows these high‑level steps:

1. **Trigger** – Runs on a schedule (e.g., every Monday at 09:00) or can be switched to a webhook.
2. **Generate video script** – Calls an LLM (OpenAI `gpt‑4o` or Anthropic `claude‑3‑sonnet`) to produce a video script based on a topic.
3. **Create video** – Sends the script to a video‑generation service (e.g., **Pictory** or **Synthesia**) which returns a video URL.
4. **Upload to YouTube** – Uses the built‑in YouTube node (OAuth2) to publish the video with title, description, tags, and thumbnail.
5. **Post notification** – Sends a message to a Discord channel (or Slack) announcing the new video.
6. **Archive** – Saves the script and video metadata to a Google Sheet for tracking.

---

## Workflow Diagram (Logical View)

```
Schedule Trigger → HTTP Request (LLM) → Set (Script) → HTTP Request (Video Service) → Set (Video URL) → YouTube Node (Upload) → Discord Node (Notify) → Google Sheets Node (Log)
```

---

## Node Details

| # | Node Type | Purpose | Key Settings |
|---|-----------|---------|--------------|
| 1 | **Cron** (Schedule Trigger) | Starts the workflow on a recurring schedule. | `Cron Expression: 0 9 * * MON` (every Monday at 09:00) |
| 2 | **HTTP Request** (LLM) | Calls the LLM API to generate a script. | • **URL**: `https://api.openai.com/v1/chat/completions` (or Anthropic endpoint)<br>• **Method**: `POST`<br>• **Authentication**: Bearer token from credential `OpenAI API`<br>• **Body** (JSON): `{ "model": "gpt-4o", "messages": [{"role":"system","content":"Write a YouTube video script about {{ $json.topic }}"}] }` |
| 3 | **Set** (Script) | Extracts `choices[0].message.content` from the LLM response and stores it as `script` for later nodes. |
| 4 | **HTTP Request** (Video Service) | Sends the script to a video‑generation platform (e.g., Pictory). | • **URL**: `https://api.pictory.ai/v1/create`<br>• **Method**: `POST`<br>• **Authentication**: API key credential `Pictory API`<br>• **Body** (JSON): `{ "script": "{{ $json.script }}", "style": "default" }` |
| 5 | **Set** (Video URL) | Pulls the returned video URL (`video_url`) and stores it as `videoUrl`. |
| 6 | **YouTube** (Upload) | Publishes the video to your YouTube channel. | • **OAuth2 Credential**: `YouTube OAuth2` (must be set up in n8n)<br>• **Title**: `{{ $json.title }}` (derived from script or a static prefix)<br>• **Description**: `{{ $json.script }}`
• **Video URL**: `{{ $json.videoUrl }}`
• **Tags**: `AI, Automation, {{ $json.topic }}` |
| 7 | **Discord** (or **Slack**) | Sends a notification with the new video link. | • **Webhook URL**: your Discord webhook credential `Discord Notification`<br>• **Content**: `New AI‑generated video published: {{ $json.videoUrl }}` |
| 8 | **Google Sheets** (Log) | Appends a row to a tracking sheet. | • **Spreadsheet ID**: (your sheet)<br>• **Range**: `Sheet1!A:D` (Date, Topic, Video URL, Status) |

---

## Full JSON Definition (Ready to Import)

```json
{
  "nodes": [
    {
      "parameters": {
        "cronExpression": "0 9 * * MON",
        "timezone": "America/New_York"
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "{{ $credentials.openaiApi.token ? 'https://api.openai.com/v1/chat/completions' : '' }}",
        "method": "POST",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "{\n  \"model\": \"gpt-4o\",\n  \"messages\": [{\n    \"role\": \"system\",\n    \"content\": \"Write a concise YouTube video script about {{ $json.topic }}. Include a title, intro, main points, and a call‑to‑action.\"\n  }]\n}"
      },
      "name": "Generate Script (LLM)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [500, 300],
      "credentials": { "openaiApi": { "id": "OpenAI API", "name": "OpenAI API" } }
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "script",
              "value": "={{ $json.choices[0].message.content }}"
            }
          ]
        },
        "options": {}
      },
      "name": "Set Script",
      "type": "n8n-nodes-base.set",
      "typeVersion": 1,
      "position": [750, 300]
    },
    {
      "parameters": {
        "url": "https://api.pictory.ai/v1/create",
        "method": "POST",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "{\n  \"script\": \"{{ $json.script }}\",\n  \"style\": \"default\"\n}"
      },
      "name": "Create Video",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [1000, 300],
      "credentials": { "pictoryApi": { "id": "Pictory API", "name": "Pictory API" } }
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "videoUrl",
              "value": "={{ $json.video_url }}"
            }
          ]
        },
        "options": {}
      },
      "name": "Set Video URL",
      "type": "n8n-nodes-base.set",
      "typeVersion": 1,
      "position": [1250, 300]
    },
    {
      "parameters": {
        "title": "{{ $json.title || 'AI‑Generated Video' }}",
        "description": "{{ $json.script }}",
        "privacy": "public",
        "tags": ["AI", "Automation", "{{ $json.topic }}"],
        "videoUrl": "{{ $json.videoUrl }}"
      },
      "name": "Upload to YouTube",
      "type": "n8n-nodes-base.youtube",
      "typeVersion": 1,
      "position": [1500, 300],
      "credentials": { "youTubeOAuth2Api": { "id": "YouTube OAuth2", "name": "YouTube OAuth2" } }
    },
    {
      "parameters": {
        "url": "{{ $credentials.discordWebhook.url }}",
        "method": "POST",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "{\n  \"content\": \"New AI‑generated video published! Watch here: {{ $json.videoUrl }}\"\n}"
      },
      "name": "Discord Notification",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [1750, 300],
      "credentials": { "discordWebhook": { "id": "Discord Notification", "name": "Discord Notification" } }
    },
    {
      "parameters": {
        "spreadsheetId": "{{ $credentials.googleSheet.spreadsheetId }}",
        "range": "Sheet1!A:D",
        "valueInputOption": "RAW",
        "insertDataOption": "INSERT_ROWS",
        "data": [
          {
            "range": "Sheet1!A:D",
            "values": [
              [
                "={{ $now }}",
                "{{ $json.topic }}",
                "{{ $json.videoUrl }}",
                "published"
              ]
            ]
          }
        ]
      },
      "name": "Log to Google Sheet",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [2000, 300],
      "credentials": { "googleApi": { "id": "Google Sheets", "name": "Google Sheets" } }
    }
  ],
  "connections": {
    "Schedule Trigger": { "main": [[{"node": "Generate Script (LLM)", "type": "main", "index": 0}]] },
    "Generate Script (LLM)": { "main": [[{"node": "Set Script", "type": "main", "index": 0}]] },
    "Set Script": { "main": [[{"node": "Create Video", "type": "main", "index": 0}]] },
    "Create Video": { "main": [[{"node": "Set Video URL", "type": "main", "index": 0}]] },
    "Set Video URL": { "main": [[{"node": "Upload to YouTube", "type": "main", "index": 0}]] },
    "Upload to YouTube": { "main": [[{"node": "Discord Notification", "type": "main", "index": 0}, {"node": "Log to Google Sheet", "type": "main", "index": 0}]] }
  },
  "active": false,
  "settings": {},
  "id": "1"
}
```

**Importing the workflow**
1. In n8n, go to **Workflows → Import**.
2. Paste the JSON above into the dialog and click **Import**.
3. Configure the required credentials (OpenAI/Anthropic, Pictory, YouTube, Discord, Google Sheets) under **Credentials**.
4. Update the `topic` source – you can replace the placeholder with a static value or another node that provides a topic (e.g., reading from a Google Sheet).
5. Activate the workflow.

---

## Customisation Tips
* **Trigger** – Switch the Cron node to a **Webhook** if you want the workflow to start on demand (e.g., from a content‑idea form).
* **LLM Choice** – Swap the OpenAI endpoint for Anthropic by editing the URL and credentials.
* **Video Service** – Replace the Pictory request with Synthesia or Runway’s API; just adjust the `url`, authentication, and request payload accordingly.
* **Metadata** – Add additional fields (thumbnail URL, playlist ID) in the YouTube node.
* **Post‑publish actions** – Add nodes for tweeting, posting to LinkedIn, or sending an email summary.

---

*Document generated with Claude Code.*