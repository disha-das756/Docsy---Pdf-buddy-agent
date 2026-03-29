# from langgraph.graph import StateGraph, END
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_pinecone import PineconeVectorStore
# from pinecone import Pinecone
# from typing import TypedDict, List, Any
# from dotenv import load_dotenv
# from embeddings import embeddings
# import os

# load_dotenv()

# # Fix: Use TypedDict instead of plain dict for LangGraph State
# class State(TypedDict):
#     query: str
#     context: List[Any]
#     answer: str

# # LLM — Fix: use a valid model name
# llm = ChatGoogleGenerativeAI(
#     model="gemini-2.5-flash",
#     temperature=0.7,
#     google_api_key=os.getenv("GOOGLE_API_KEY")
# )


# # Pinecone
# pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
# index = pc.Index("ragchatbot")

# vectorstore = PineconeVectorStore(
#     index=index,
#     embedding=embeddings
# )

# retriever = vectorstore.as_retriever(
#     search_kwargs={"k": 3}
# )

# # Retrieve Node
# def retrieve(state: State) -> dict:
#     query = state.get("query", "")

#     if not query:
#         return {"context": []}

#     docs = retriever.invoke(query)
#     return {"context": docs}

# # Generate Node
# def generate(state: State) -> dict:
#     docs = state.get("context", [])

#     if not docs:
#         return {"answer": "I couldn't find anything in the story. Please try a different question."}

#     context = "\n\n".join([doc.page_content for doc in docs])

#     prompt = f"""
#     You are a helpful story assistant.

#     Use ONLY the context below to answer the question.
#     If the answer is not in the context, say "I don't know".

#     Context:
#     {context}

#     Question:
#     {state.get('query', '')}

#     Answer in simple and clear language:
#     """

#     response = llm.invoke(prompt)
#     return {"answer": response.content}

# # Build Graph — Fix: added END edge so graph terminates properly
# builder = StateGraph(State)
# builder.add_node("retrieve", retrieve)
# builder.add_node("generate", generate)

# builder.set_entry_point("retrieve")
# builder.add_edge("retrieve", "generate")
# builder.add_edge("generate", END)   # Fix: missing in original

# graph = builder.compile()

from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from typing import TypedDict, List, Any
from dotenv import load_dotenv
from embeddings import embeddings
import os

load_dotenv()

class State(TypedDict):
    query: str
    context: List[Any]
    answer: str
    history: str

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.7,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("ragchatbot")

vectorstore = PineconeVectorStore(
    index=index,
    embedding=embeddings
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

def retrieve(state: State):
    query = state.get("query", "")
    docs = retriever.invoke(query) if query else []
    return {"context": docs}

def generate(state: State):
    docs = state.get("context", [])
    history = state.get("history", "")

    if not docs:
        return {"answer": "I couldn't find anything in the story."}

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
    You are a story assistant.

    Chat History:
    {history}

    Context:
    {context}

    Question:
    {state.get('query')}

    Answer simply:
    """

    response = llm.invoke(prompt)
    return {"answer": response.content}

builder = StateGraph(State)
builder.add_node("retrieve", retrieve)
builder.add_node("generate", generate)

builder.set_entry_point("retrieve")
builder.add_edge("retrieve", "generate")
builder.add_edge("generate", END)

graph = builder.compile()
