from flask import Flask, request, jsonify
from openai import OpenAI
import os
from dotenv import load_dotenv
from flask_cors import CORS
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def process_with_gpt(chain_context, user_input):
    """Process user input with GPT-4 and return structured response"""
    
    system_prompt = f"""You are a {chain_context} blockchain expert. 
    Analyze the user's input and extract the operation type, tokens, and amount involved.
    Always include an amount (use "0" if not specified in input).
    Output only a JSON with this format (capitalize token symbols): {{
        "operation": "type",
        "token1": "symbol",
        "token2": "symbol",
        "amount": "amount"
    }}
    For non-swap operations, token2 can be null but amount must always be present. If the operation is "stake" then add a field "protocol". If protocol not found simply return Specify protocol.
    Possible operations: "transfer", "stake", "swap". If operation is "transfer" then token2 is null and you need to add a field "wallet"   """

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            temperature=0.7
        )
        
        # Parse the response to ensure it's valid JSON before sending
        response_content = response.choices[0].message.content
        parsed_json = json.loads(response_content)  # Validate JSON
        return jsonify({"response": response_content})
    except Exception as e:
        print(f"Error processing GPT response: {str(e)}")  # Debug print
        return jsonify({"error": str(e)}), 500

@app.route('/bnb', methods=['POST'])
def bnb_endpoint():
    print("BNB endpoint hit!")  # Debug print
    if not request.json or 'input' not in request.json:
        print("No input provided")  # Debug print
        return jsonify({"error": "No input provided"}), 400
    
    user_input = request.json['input']
    print(f"Received input: {user_input}")  # Debug print
    
    return process_with_gpt("BNB Chain", user_input)

@app.route('/avalanche', methods=['POST'])
def avalanche_endpoint():
    if not request.json or 'input' not in request.json:
        return jsonify({"error": "No input provided"}), 400
    
    user_input = request.json['input']
    return process_with_gpt("Avalanche", user_input)

@app.route('/solana', methods=['POST'])
def solana_endpoint():
    if not request.json or 'input' not in request.json:
        return jsonify({"error": "No input provided"}), 400
    
    user_input = request.json['input']
    return process_with_gpt("Solana", user_input)

@app.route('/confirm', methods=['POST'])
def confirm_transaction():
    """Handle transaction confirmation"""
    try:
        operation = request.json.get('operation', 'Unknown')
        print(f"{operation.upper()} is in process...")
        
        return jsonify({
            "status": "success",
            "message": f"{operation.upper()} is in process..."
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    print("Starting Flask server...")  # Debug print
    app.run(debug=True, port=5001, host='0.0.0.0')
