from flask import Flask, request, jsonify
from openai import OpenAI
import os
from dotenv import load_dotenv
from flask_cors import CORS
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def process_with_gpt(chain_context, user_input):
    """Process user input with GPT-4 and return structured response"""
    
    system_prompt = f"""You are a {chain_context} blockchain expert.
    You need to respond to user's input and interract with the user.
    

    If the users asks for action input e.g. "transfer","send", "stake", "swap", you need to analyze the user's input and extract the operation type, tokens, and amount involved.
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
        
        response_content = response.choices[0].message.content
        try:
            # Try to parse as JSON first
            parsed_json = json.loads(response_content)
            return jsonify({"response": response_content})
        except json.JSONDecodeError:
            # If not valid JSON, return as plain text response
            return jsonify({
                "response": f"I am a {chain_context} expert. {response_content}"
            })
            
    except Exception as e:
        print(f"Error processing GPT response: {str(e)}")
        return jsonify({
            "response": "I apologize, but I encountered an error processing your request."
        }), 500

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

@app.route('/select-chain', methods=['POST'])
def select_chain():
    """Determine which chain's agent should handle the query"""
    if not request.json or 'input' not in request.json:
        return jsonify({"error": "No input provided"}), 400
    
    user_input = request.json['input']
    
    # Create a system prompt for chain selection
    system_prompt = """You are a blockchain expert. Analyze the user's query and determine if it's more relevant to BNB Chain, Avalanche, or Solana.
    Only respond with either "BNB", "AVAX", or "SOL". If the query is generic or could apply to all, default to "BNB"."""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            temperature=0.3
        )
        
        chain = response.choices[0].message.content.strip().upper()
        
        # Map the chain to a number
        chain_map = {
            "BNB": 1,
            "AVAX": 2,
            "SOL": 3
        }
        
        agent_id = chain_map.get(chain, 1)  # Default to BNB if response is unexpected
        
        return jsonify({"agentId": agent_id})
            
    except Exception as e:
        print(f"Error in chain selection: {str(e)}")
        return jsonify({
            "error": "Error processing chain selection"
        }), 500

@app.route('/confirm', methods=['POST'])
def confirm_transaction():
    """Handle transaction confirmation"""
    print("\n=== Confirm Transaction Endpoint ===")
    print(f"Request received: {request}")
    print(f"Request headers: {request.headers}")
    print(f"Request data: {request.get_data(as_text=True)}")  # Print raw request data
    
    if not request.is_json:
        print("Error: Request is not JSON")
        return jsonify({"error": "Request must be JSON"}), 400
        
    try:
        data = request.get_json()
        print(f"Parsed JSON data: {data}")
        operation = data.get('operation', 'Unknown')
        transaction = data.get('transaction', {})
        print(f"Operation: {operation}")
        print(f"Transaction: {transaction}")
        
        response = {
            "status": "success",
            "message": f"{operation.upper()} is in process..."
        }
        print(f"Sending response: {response}")
        
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Error processing request: {str(e)}"
        print(error_msg)
        return jsonify({
            "status": "error",
            "message": error_msg
        }), 500

@app.route('/reject', methods=['POST'])
def reject_transaction():
    """Handle transaction rejection"""
    print("\n=== Reject Transaction Endpoint ===")
    print("Transaction rejected")
    return jsonify({
        "status": "success",
        "message": "Transaction rejected"
    })

if __name__ == '__main__':
    print("Starting Flask server...")  # Debug print
    app.run(debug=True, port=5001, host='0.0.0.0')
