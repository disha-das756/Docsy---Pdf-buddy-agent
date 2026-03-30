from langchain_pinecone import PineconeEmbeddings

_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print("Loading Pinecone embedding model...")
        _embeddings = PineconeEmbeddings(
            model="llama-text-embed-v2"  
        )
    return _embeddings