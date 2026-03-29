from langchain_text_splitters import RecursiveCharacterTextSplitter

def split_text(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100
    )
    return splitter.split_text(text)
