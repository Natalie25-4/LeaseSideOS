import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
response = client.models.generate_content(
    model = "gemini-3.5-flash",
    contents="Say hello as if you were Clark, a commercial property AI assistant.",
)

print (response.text)