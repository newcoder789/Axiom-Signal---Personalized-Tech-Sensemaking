from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from langchain_groq import ChatGroq
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Axiom v0")
    
# structured input and output 
class AxiomResponse(BaseModel):
    summary: str = Field(..., description="Short explanation of the topic")
    current_status: str = Field(
        ..., description="Explain relevance based on user's background"
    )
    future_advice: str = Field(
        ...,
        description="Actionable next steps tailored to the user's profile. If not relevant, explicitly say why.",
    )


class AxiomRequest(BaseModel):
    topic: str
    user_profile: Optional[str] = None
    
    
# llm 
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
)

parser = JsonOutputParser(pydantic_object=AxiomResponse)

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are Axiom, a tech-scout and decision engine.
Your job is to explain topics clearly and give honest career-oriented advice.
Return ONLY valid JSON that matches the given schema.
Always return ALL fields in the response schema.
If future advice is weak or not necessary, explicitly state that and explain why.
Never omit a field.
No markdown. No explanations. No extra text.
{format_instructions}
""",
        ),
        (
            "human",
            """Topic: {topic}
User background: {user_profile}""",
        ),
    ]
)

chain = prompt | llm | parser
@app.post("/axiom/run", response_model=AxiomResponse)
def run_axiom(req: AxiomRequest):
    try:
        result = chain.invoke(
            {
                "topic": req.topic,
                "user_profile": req.user_profile or "Not provided",
                "format_instructions": parser.get_format_instructions(),
            }
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


"""
input: 
{
  "topic": "LangGraph",
  "user_profile": "3rd-year CS student interested in backend + AI, preparing for job market"
}


First Response: 
{
  "summary": "LangGraph is a graph-based language model that combines the strengths of both graph neural networks and transformer models. It's designed to capture complex relationships between words and their contexts, making it a promising approach for natural language processing tasks.",
  "current_status": "Relevant to your background as a 3rd-year CS student interested in backend + AI. You've likely studied graph neural networks and transformer models in your coursework, and LangGraph's architecture is an interesting application of these concepts. However, you may not have hands-on experience with LangGraph specifically, so it's essential to explore its implementation and applications.",
  "future_advice": "To get started with LangGraph, explore its implementation in popular deep learning frameworks like PyTorch or TensorFlow. You can also look into research papers and pre-trained models to understand its applications in NLP tasks. As you prepare for the job market, focus on developing a strong foundation in graph neural networks, transformer models, and their applications in AI. Practice building and deploying LangGraph-based models to demonstrate your skills to potential employers."
}
"""