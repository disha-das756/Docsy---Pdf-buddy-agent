# from langchain_community.document_loaders import PyPDFLoader
# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_pinecone import PineconeVectorStore
# from dotenv import load_dotenv
# from embeddings import embeddings
# import os

# load_dotenv()

# def ingest_pdf(file_path):
#     loader = PyPDFLoader(file_path)
#     docs = loader.load()

#     # Fix: import from same directory, not utils/
#     from chunking import split_text

#     texts = []
#     metadatas = []

#     for doc in docs:
#         chunks = split_text(doc.page_content)
#         for chunk in chunks:
#             texts.append(chunk)
#             metadatas.append({
#                 "page": doc.metadata.get("page", "unknown")
#             })


#     PineconeVectorStore.from_texts(
#         texts=texts,
#         embedding=embeddings,
#         metadatas=metadatas,
#         index_name="ragchatbot"
#     )

#     print("✅ Data stored in Pinecone")



from langchain_community.document_loaders import PyPDFLoader
from langchain_pinecone import PineconeVectorStore
from dotenv import load_dotenv
from embeddings import get_embeddings
import os

load_dotenv()

def ingest_pdf(file_path):
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    from chunking import split_text

    texts = []
    metadatas = []

    for doc in docs:
        chunks = split_text(doc.page_content)
        for chunk in chunks:
            texts.append(chunk)
            metadatas.append({
                "page": doc.metadata.get("page", "unknown")
            })

    PineconeVectorStore.from_texts(
        texts=texts,
        embedding=get_embeddings(),       # <-- load only when needed
        metadatas=metadatas,
        index_name="ragchatbot"
    )

    print("✅ Data stored in Pinecone")