import requests
import os
import json
import datetime
from collections import defaultdict
import time

##############################
# 1) Configuration Variables #
##############################

# Aggregator endpoint (placeholder).
AGGREGATOR_URL = "https://apis.datura.ai/twitter"

# Provide your aggregator's auth token (if required).
AGGREGATOR_API_KEY = os.getenv('TWITTER_API_KEY')

# Provide your OpenAI API key for ChatGPT analysis.
OPENAI_API_KEY = os.getenv('OPEN_AI_API_KEY')

# Desired ChatGPT model.
CHATGPT_MODEL = "gpt-4o-latest"

# Folder to store conversation threads.
OUTPUT_FOLDER = "debate_chains"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# File containing a list of Twitter accounts (one per line).
ACCOUNTS_FILE = "twittersearch/accounts.txt"


#######################################
# 2) Build Query for Recent (10 min) Tweets
#######################################
def build_query_for_user_recent_tweets(username):
    """
    Returns an advanced-search query string to get 'original' tweets
    authored by `username` in the last 10 minutes (i.e., excluding replies).
    """
    now = datetime.datetime.utcnow()
    ten_minutes_ago = now - datetime.timedelta(minutes=10)

    # Build a time-filter using the advanced search syntax:
    #  since:YYYY-MM-DD_HH:MM:SS_UTC until:YYYY-MM-DD_HH:MM:SS_UTC
    since_str = ten_minutes_ago.strftime('%Y-%m-%d_%H:%M:%S_UTC')
    until_str = now.strftime('%Y-%m-%d_%H:%M:%S_UTC')

    # Exclude replies with '-filter:replies'
    # Exclude retweets with '-filter:nativeretweets' if desired
    # Only from username
    query = (
        f"from:{username} "
        f"-filter:replies "
        f"-filter:nativeretweets "
        f"since:{since_str} "
        f"until:{until_str}"
    )
    return query, ten_minutes_ago, now


############################################
# 3) Build Query for Replies (50% of Likes)
############################################
def build_query_for_popular_replies(conversation_id, min_faves_required):
    """
    Given a conversation_id (parent tweet) and a minimum like threshold,
    return an advanced-search query to find replies with that many likes.
    """
    now = datetime.datetime.utcnow()
    ten_minutes_ago = now - datetime.timedelta(minutes=10)

    since_str = ten_minutes_ago.strftime('%Y-%m-%d_%H:%M:%S_UTC')
    until_str = now.strftime('%Y-%m-%d_%H:%M:%S_UTC')

    # conversation_id:{tweet_id} filter:replies min_faves:{min_faves_required}
    query = (
        f"conversation_id:{conversation_id} "
        f"filter:replies "
        f"min_faves:{min_faves_required} "
        f"since:{since_str} "
        f"until:{until_str}"
    )
    return query, ten_minutes_ago, now


########################################
# 4) Fetch Original Tweets (Last 10 min)
########################################
def fetch_recent_tweets_for_account(username):
    """
    Fetch 'original' tweets for the user from the last 10 minutes
    using our aggregator. Returns a list of tweet objects.
    """
    # 1) Build the advanced-search query and time window
    query_string, start_dt, end_dt = build_query_for_user_recent_tweets(username)

    # Convert datetimes to aggregator-friendly strings if needed
    start_date_str = start_dt.isoformat() + "Z"
    end_date_str = end_dt.isoformat() + "Z"

    # Adjust aggregator payload as needed
    payload = {
        "query": query_string,
        "sort": "Top",  # or "Top"
        "start_date": start_date_str,
        "end_date": end_date_str,
        "lang": "en",
        # Example aggregator flags below; adapt as necessary.
        "verified": False,
        "blue_verified": False,
        "is_quote": False,
        "is_video": False,
        "is_image": False,
        # Since these are "original" tweets, we might not force min_likes or min_replies here.
    }

    headers = {
        "Authorization": AGGREGATOR_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        print(f"\n{'='*50}")
        print(f"API Request for recent tweets of @{username}")
        print(f"{'='*50}")
        print("Payload:", json.dumps(payload, indent=2))
        
        response = requests.post(AGGREGATOR_URL, json=payload, headers=headers)
        
        print("\nResponse:")
        print(f"Status Code: {response.status_code}")
        print("Headers:", json.dumps(dict(response.headers), indent=2))
        print("Body:", json.dumps(response.json(), indent=2))
        
        if response.status_code == 429:  # Rate limit
            wait_time = 60
            print(f"\nRate limit hit. Waiting {wait_time} seconds...")
            time.sleep(wait_time)
            return fetch_recent_tweets_for_account(username)
            
        if response.status_code != 200:
            print(f"[ERROR] API returned status {response.status_code}")
            return []

        data = response.json()
        tweets = data.get("results", [])
        print(f"\nReceived {len(tweets)} tweets for last 10 minutes.")
        return tweets
        
    except Exception as e:
        print(f"[ERROR] Failed to fetch tweets: {str(e)}")
        return []


#########################################
# 5) Fetch Popular Replies for One Tweet
#########################################
def fetch_popular_replies_for_tweet(tweet):
    """
    For a single 'original' tweet, fetch replies that have at least
    50% of the parent's like_count.
    Returns a list of tweet objects (replies).
    """
    # How many likes did the original tweet have?
    # Adjust key if your aggregator returns a different field name.
    parent_likes = tweet.get("like_count", 0)
    # Compute 50% threshold; ensure at least 1 so min_faves doesn't break
    min_faves_required = max(1, int(parent_likes * 0.5))

    # conversation_id is typically the parent's ID. Adjust if aggregator differs.
    conversation_id = tweet.get("id")
    if not conversation_id:
        print("[WARN] No conversation_id / tweet ID for replies query.")
        return []

    # Build the advanced-search query for popular replies
    query_string, start_dt, end_dt = build_query_for_popular_replies(
        conversation_id,
        min_faves_required
    )

    start_date_str = start_dt.isoformat() + "Z"
    end_date_str = end_dt.isoformat() + "Z"

    payload = {
        "query": query_string,
        "sort": "Top",
        "start_date": start_date_str,
        "end_date": end_date_str,
        "lang": "en",
        "verified": False,
        "blue_verified": False,
        "is_quote": False,
        "is_video": False,
        "is_image": False,
        # Force aggregator to find replies with at least X likes:
        "min_likes": min_faves_required
    }

    headers = {
        "Authorization": AGGREGATOR_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        print(f"\n[POP-REPLIES] Fetching replies for TweetID {conversation_id}")
        print("Payload:", json.dumps(payload, indent=2))
        
        response = requests.post(AGGREGATOR_URL, json=payload, headers=headers)
        
        print("\nResponse:")
        print(f"Status Code: {response.status_code}")
        print("Headers:", json.dumps(dict(response.headers), indent=2))
        print("Body:", json.dumps(response.json(), indent=2))

        if response.status_code == 429:  # Rate limit
            wait_time = 60
            print(f"\nRate limit hit. Waiting {wait_time} seconds...")
            time.sleep(wait_time)
            return fetch_popular_replies_for_tweet(tweet)
            
        if response.status_code != 200:
            print(f"[ERROR] API returned status {response.status_code}")
            return []

        data = response.json()
        replies = data.get("results", [])
        print(f"[POP-REPLIES] Received {len(replies)} replies meeting threshold.")
        return replies
    except Exception as e:
        print(f"[ERROR] Failed to fetch replies: {str(e)}")
        return []


########################################
# 6) Group Tweets by Conversation ID
########################################
def group_tweets_by_conversation(tweets):
    """
    Given a list of tweets (dictionaries),
    group them by conversation_id.
    
    Returns a dict:
        { conv_id: [tweet1, tweet2, ...], ...}
    """
    conv_map = defaultdict(list)
    for tw in tweets:
        # aggregator may store conversation_id or just 'id' if it's the parent
        conv_id = tw.get("conversation_id")
        if not conv_id:
            # fallback
            conv_id = tw.get("id", "NO_CONVERSATION_ID")
        conv_map[conv_id].append(tw)

    return conv_map


########################################
# 7) Write Conversation Threads to Files
########################################
def write_threads_to_files(username, conversation_map):
    """
    For each conversation ID in the map, write the tweets
    to a separate file in OUTPUT_FOLDER.
    Returns a list of file paths for the created conversation files.
    """
    file_paths = []
    for conv_id, tw_list in conversation_map.items():
        # Sort by creation time if aggregator includes "created_at"
        tw_list.sort(key=lambda x: x.get("created_at", ""))

        # Build a filename like: "debate_chains/username_CONVID.txt"
        filename = f"{username}_{conv_id}.txt"
        filepath = os.path.join(OUTPUT_FOLDER, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            for tw in tw_list:
                tweet_id = tw.get("id", "UNKNOWN")
                author = tw.get("author", "UNKNOWN")
                text = tw.get("text", "")
                created_at = tw.get("created_at", "")
                like_count = tw.get("like_count", 0)
                # Write a simple representation
                f.write(f"TweetID: {tweet_id}\n")
                f.write(f"Author: {author}\n")
                f.write(f"Time: {created_at}\n")
                f.write(f"Likes: {like_count}\n")
                f.write(f"{text}\n\n")

        file_paths.append(filepath)

    print(f"[DEBUG] Wrote {len(conversation_map)} conversation(s) for @{username}.")
    return file_paths


##################################################
# 8) Analyze the Conversations with ChatGPT (OpenAI)
##################################################
def analyze_conversation_file(filepath):
    """
    Send the content of a conversation file to ChatGPT for analysis
    and return ChatGPT's summarized response.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        convo_text = f.read()

    # Construct the prompt
    prompt = f"""
You are an assistant analyzing a Twitter conversation that may contain controversy or debate.
Below is a chronological list of tweets in the conversation (including author info).

Conversation:
{convo_text}

Your tasks:
1. Identify if there is a heated debate, mild disagreement, or a general controversy.
2. Summarize the key points of contention or disagreement.
3. Note any strong sentiment (anger, insults, intense disagreement, etc.) or unusual politeness.
4. Provide a short, concise summary of the conversation's tone and content.
"""

    # OpenAI Chat Completion endpoint
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    payload = {
        "model": CHATGPT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a helpful analyst summarizing tweet conversations. "
                    "Your answers should be short and focus on the nature of the debate."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }

    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        print(f"[ERROR] OpenAI API returned {response.status_code}: {response.text}")
        return "Error from ChatGPT API."

    try:
        data = response.json()
        # Typically: data["choices"][0]["message"]["content"]
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[ERROR] Parsing ChatGPT response: {e}")
        return "Error: Malformed ChatGPT response."


#####################################
# 9) Main Orchestration
#####################################
def main():
    """
    - Read the accounts from accounts.txt
    - For each account:
        1) Fetch original tweets (last 10 mins)
        2) For each tweet, fetch popular replies (≥50% likes)
        3) Combine parent + replies => group by conversation ID
        4) Write conversation threads
        5) Analyze each file with ChatGPT
    """
    # Read accounts from file
    if not os.path.isfile(ACCOUNTS_FILE):
        print(f"[ERROR] Can't find {ACCOUNTS_FILE}. Please create it.")
        return

    with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
        accounts = [line.strip() for line in f if line.strip()]

    if not accounts:
        print("[ERROR] No accounts found in accounts.txt.")
        return

    for username in accounts:
        print(f"\n=== Processing @{username} ===")

        # 1) Fetch original tweets from the last 10 minutes
        original_tweets = fetch_recent_tweets_for_account(username)
        if not original_tweets:
            print(f"No recent tweets found for @{username}. Skipping...")
            continue

        # 2) For each tweet, fetch popular replies
        combined_tweets = []
        for tw in original_tweets:
            combined_tweets.append(tw)  # Include the parent tweet itself
            popular_replies = fetch_popular_replies_for_tweet(tw)
            combined_tweets.extend(popular_replies)

        # 3) Group all (parent + replies) by conversation
        conv_map = group_tweets_by_conversation(combined_tweets)

        # 4) Write to separate files
        conv_files = write_threads_to_files(username, conv_map)

        # 5) Analyze each file with ChatGPT
        for cfile in conv_files:
            print(f"\n[ANALYSIS] Conversation file: {cfile}")
            summary = analyze_conversation_file(cfile)
            print("\n=== ChatGPT Summary ===")
            print(summary)
            print("=======================\n")


if __name__ == "__main__":
    main()
