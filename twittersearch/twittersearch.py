import requests
import os
from openai import OpenAI
import dotenv

dotenv.load_dotenv()

# Load API keys
TWITTER_API_KEY = os.getenv('TWITTER_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

url = "https://apis.datura.ai/twitter"

payload = {
    "query": "from:cz_binance since:2025-02-07 until:2025-02-08",
    "sort": "Latest",
    "start_date": "2025-02-07",
    "end_date": "2025-02-08",
    "lang": "en",
    "verified": True,
    "blue_verified": False,
    "is_quote": True,
    "is_video": False,
    "is_image": False,
    "min_retweets": 1,
    "min_replies": 1,
    "min_likes": 10
}
headers = {
    "Authorization": "dt_$43jT5EUlAiSlu2mX2aehFioRonpIjvCmwnVbSQjL_E8",
    "Content-Type": "application/json"
}

response = requests.request("POST", url, json=payload, headers=headers)

# Add error handling
if response.status_code != 200:
    print(f"Error: {response.status_code}")
    print(response.text)
else:
    # Print the raw response
    print("\nTwitter API Response:")
    print(response.text)
    
    tweets_data = response.json()
    
    # Filter and clean the tweet data
    if isinstance(tweets_data, dict) and 'data' in tweets_data:
        filtered_data = []
        for tweet in tweets_data['data']:
            filtered_tweet = {
                'text': tweet.get('text', ''),
                'username': tweet.get('username', ''),
                'date': tweet.get('date', ''),
                'likes': tweet.get('likes', 0),
                'retweets': tweet.get('retweets', 0),
                'replies': tweet.get('replies', 0)
            }
            filtered_data.append(filtered_tweet)
        tweets_data = {'data': filtered_data}
    
    # Create simple message for ChatGPT
    chatgpt_messages = [
        {
            'role': 'system',
            'content': 'Answer if the tweet data include subscriber responses'
        },
        {
            'role': 'user',
            'content': str(tweets_data)  # Send the filtered data to ChatGPT
        }
    ]

    # Send to ChatGPT and get response
    try:
        response = client.chat.completions.create(
            model="chatgpt-4o-latest",
            messages=chatgpt_messages
        )
        
        # Print ChatGPT's analysis
        print("\nChatGPT Analysis:")
        print(response.choices[0].message.content)
    except Exception as e:
        print(f"Error calling ChatGPT API: {str(e)}")


