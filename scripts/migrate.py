import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
import urllib.request
import fitz
from uuid import uuid4

# Load env vars
env_vars = {}
with open('.env.local') as f:
    for line in f:
        if '=' in line:
            k, v = line.strip().split('=', 1)
            # Remove surrounding quotes and replace \n with actual newlines
            if v.startswith('"') and v.endswith('"'):
                v = v[1:-1]
            env_vars[k] = v.replace('\\n', '\n')

cred = credentials.Certificate({
    "type": "service_account",
    "project_id": env_vars["FIREBASE_PROJECT_ID"],
    "private_key_id": "",
    "private_key": env_vars["FIREBASE_PRIVATE_KEY"],
    "client_email": env_vars["FIREBASE_CLIENT_EMAIL"],
    "client_id": "",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{env_vars['FIREBASE_CLIENT_EMAIL']}"
})

firebase_admin.initialize_app(cred, {
    'storageBucket': f"{env_vars['FIREBASE_PROJECT_ID']}.firebasestorage.app"
})

db = firestore.client()
bucket = storage.bucket()

# Fix bucket name if it differs (usually project_id.appspot.com)
if not bucket.exists():
    firebase_admin.delete_app(firebase_admin.get_app())
    firebase_admin.initialize_app(cred, {
        'storageBucket': f"{env_vars['FIREBASE_PROJECT_ID']}.appspot.com"
    })
    bucket = storage.bucket()

def process_pdfs():
    songs_ref = db.collection('worshipSongs')
    docs = songs_ref.stream()

    for doc in docs:
        song = doc.to_dict()
        song_id = doc.id
        sheets = song.get('chordSheets', [])
        
        has_pdfs = any('.pdf' in s.get('imageUrl', '').lower() for s in sheets)
        if not has_pdfs:
            continue
            
        print(f"Processing song: {song.get('title')} ({song_id})")
        
        new_sheets = []
        modified = False
        
        for sheet in sheets:
            url = sheet.get('imageUrl', '')
            if '.pdf' not in url.lower():
                new_sheets.append(sheet)
                continue
                
            print(f"  - Downloading PDF for key {sheet.get('key')}")
            try:
                pdf_path = f"temp_{song_id}_{sheet.get('id')}.pdf"
                urllib.request.urlretrieve(url, pdf_path)
                
                doc_pdf = fitz.open(pdf_path)
                for i in range(len(doc_pdf)):
                    page = doc_pdf.load_page(i)
                    pix = page.get_pixmap(dpi=150)
                    img_path = f"temp_{song_id}_{sheet.get('id')}_{i}.jpg"
                    pix.save(img_path)
                    
                    # Upload to storage
                    blob_path = f"worship-sheets/{uuid4()}.jpg"
                    blob = bucket.blob(blob_path)
                    blob.upload_from_filename(img_path, content_type="image/jpeg")
                    blob.make_public()
                    
                    new_url = blob.public_url
                    new_sheets.append({
                        "id": str(uuid4()),
                        "key": sheet.get('key'),
                        "imageUrl": new_url,
                        "uploadedAt": sheet.get('uploadedAt') or firestore.SERVER_TIMESTAMP
                    })
                    
                    os.remove(img_path)
                    print(f"    Uploaded page {i+1} -> {new_url}")
                    
                doc_pdf.close()
                os.remove(pdf_path)
                modified = True
            except Exception as e:
                print(f"  - Error processing PDF: {e}")
                new_sheets.append(sheet) # keep old sheet on failure
                
        if modified:
            songs_ref.document(song_id).update({'chordSheets': new_sheets})
            print(f"Updated song {song.get('title')}")

if __name__ == "__main__":
    process_pdfs()
    print("Done!")
