document.addEventListener('DOMContentLoaded', function() {
    const templateUpload = document.getElementById('template-upload');
    const templateInfo = document.getElementById('template-info');
    const resultSection = document.getElementById('result-section');
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    const downloadBtn = document.getElementById('download-btn');
    const previewElement = document.getElementById('preview');
    
    let convertedTemplate = null;
    
    templateUpload.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const content = await readFileAsJSON(file);
            templateInfo.textContent = `ファイル名: ${file.name}, サイズ: ${(file.size / 1024).toFixed(2)} KB`;
            
            // labelmakeからpdfmeへの変換処理
            convertedTemplate = convertLabelmakeToPdfme(content);
            
            // プレビュー表示
            showPreview(convertedTemplate);
            
            resultSection.style.display = 'block';
            errorSection.style.display = 'none';
        } catch (err) {
            console.error('Error processing file:', err);
            errorMessage.textContent = `エラー: ${err.message}`;
            resultSection.style.display = 'none';
            errorSection.style.display = 'block';
        }
    });
    
    downloadBtn.addEventListener('click', function() {
        if (convertedTemplate) {
            downloadJSON(convertedTemplate, 'pdfme-template.json');
        }
    });
    
    // ファイルをJSONとして読み込む
    function readFileAsJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const json = JSON.parse(e.target.result);
                    resolve(json);
                } catch (err) {
                    reject(new Error('JSONの解析に失敗しました。有効なlabelmakeテンプレートファイルを選択してください。'));
                }
            };
            reader.onerror = function() {
                reject(new Error('ファイルの読み込みに失敗しました。'));
            };
            reader.readAsText(file);
        });
    }
    
    // labelmakeのテンプレートをpdfmeのテンプレートに変換
    function convertLabelmakeToPdfme(labelmakeTemplate) {
        // labelmakeのテンプレート構造を確認
        if (!labelmakeTemplate.template) {
            throw new Error('無効なlabelmakeテンプレート形式です。');
        }
        
        // pdfmeのテンプレート構造を作成
        const pdfmeTemplate = {
            schemas: [],
            basePdf: labelmakeTemplate.template.basePdf || null
        };
        
        // labelmakeのフィールドをpdfmeのスキーマに変換
        if (labelmakeTemplate.template.schemas) {
            labelmakeTemplate.template.schemas.forEach(schema => {
                const pdfmeSchema = {
                    type: mapFieldType(schema.type),
                    position: {
                        x: schema.position.x,
                        y: schema.position.y
                    },
                    width: schema.width,
                    height: schema.height,
                    name: schema.key,
                    // pdfmeの追加プロパティ
                    alignment: mapAlignment(schema.align),
                    fontSize: schema.fontSize || 12,
                    fontColor: schema.fontColor || '#000000',
                    backgroundColor: schema.backgroundColor || null,
                    page: schema.page || 1
                };
                
                pdfmeTemplate.schemas.push(pdfmeSchema);
            });
        }
        
        return pdfmeTemplate;
    }
    
    // labelmakeのフィールドタイプをpdfmeのタイプにマッピング
    function mapFieldType(labelmakeType) {
        const typeMap = {
            'text': 'text',
            'image': 'image',
            // 他のタイプのマッピングを追加
        };
        
        return typeMap[labelmakeType] || 'text';
    }
    
    // テキスト配置のマッピング
    function mapAlignment(labelmakeAlign) {
        const alignMap = {
            'left': 'left',
            'center': 'center',
            'right': 'right'
        };
        
        return alignMap[labelmakeAlign] || 'left';
    }
    
    // プレビュー表示
    function showPreview(template) {
        // pdfme UIを使用してプレビューを表示
        // 注: 実際のプレビュー実装はpdfmeのAPIに依存します
        previewElement.innerHTML = `<pre>${JSON.stringify(template, null, 2)}</pre>`;
        
        // 実際のpdfmeプレビューを実装する場合は以下のようなコードになります
        /*
        try {
            const { Template } = PDFMe;
            const viewer = new Template.Viewer({
                domContainer: previewElement,
                template: template
            });
            viewer.render();
        } catch (err) {
            console.error('Preview error:', err);
            previewElement.innerHTML = '<p>プレビューの表示に失敗しました。</p>';
        }
        */
    }
    
    // JSONファイルのダウンロード
    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
