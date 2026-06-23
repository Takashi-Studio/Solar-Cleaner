import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_text_from_docx(docx_path, output_path):
    try:
        with zipfile.ZipFile(docx_path, 'r') as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            # The namespace for Word XML
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            text_blocks = []
            for paragraph in tree.findall('.//w:p', namespaces):
                texts = [node.text for node in paragraph.findall('.//w:t', namespaces) if node.text]
                if texts:
                    text_blocks.append(''.join(texts))
                else:
                    text_blocks.append('') # Empty line for paragraph break
                    
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(text_blocks))
            print(f"Successfully wrote to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    extract_text_from_docx(sys.argv[1], sys.argv[2])
