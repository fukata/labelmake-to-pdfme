document.addEventListener('DOMContentLoaded', function() {
    const labelmakeApiKeyInput = document.getElementById('labelmake-api-key');
    const pdfmeApiKeyInput = document.getElementById('pdfme-api-key');
    const templateNameInput = document.getElementById('template-name');
    const templateDescriptionInput = document.getElementById('template-description');
    const templateTagsInput = document.getElementById('template-tags');
    const templateSchemaInput = document.getElementById('template-schema');
    const registerBtn = document.getElementById('register-btn');
    const templateInfo = document.getElementById('template-info');
    const resultSection = document.getElementById('result-section');
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    const downloadBtn = document.getElementById('download-btn');
    const previewElement = document.getElementById('preview');
    const loadTemplatesBtn = document.getElementById('load-templates-btn');
    const templatesListSection = document.getElementById('templates-list-section');
    const templatesList = document.getElementById('templates-list');
    
    let convertedTemplate = null;
    let labelmakeApiKey = '';
    let pdfmeApiKey = '';
    
    // APIキーの変更を監視（changeとinputの両方で）
    labelmakeApiKeyInput.addEventListener('change', function(e) {
        labelmakeApiKey = e.target.value.trim();
        sessionStorage.setItem('labelmakeApiKey', labelmakeApiKey);
    });
    
    labelmakeApiKeyInput.addEventListener('input', function(e) {
        labelmakeApiKey = e.target.value.trim();
        sessionStorage.setItem('labelmakeApiKey', labelmakeApiKey);
    });
    
    pdfmeApiKeyInput.addEventListener('change', function(e) {
        pdfmeApiKey = e.target.value.trim();
        sessionStorage.setItem('pdfmeApiKey', pdfmeApiKey);
    });
    
    pdfmeApiKeyInput.addEventListener('input', function(e) {
        pdfmeApiKey = e.target.value.trim();
        sessionStorage.setItem('pdfmeApiKey', pdfmeApiKey);
    });
    
    // セッションストレージからAPIキーを復元
    if (sessionStorage.getItem('labelmakeApiKey')) {
        labelmakeApiKey = sessionStorage.getItem('labelmakeApiKey');
        labelmakeApiKeyInput.value = labelmakeApiKey;
    }
    
    if (sessionStorage.getItem('pdfmeApiKey')) {
        pdfmeApiKey = sessionStorage.getItem('pdfmeApiKey');
        pdfmeApiKeyInput.value = pdfmeApiKey;
    }
    
    // テンプレート一覧を読み込むボタンのイベントリスナー
    loadTemplatesBtn.addEventListener('click', async function() {
        if (!labelmakeApiKey) {
            errorMessage.textContent = 'labelmake APIキーを入力してください。';
            errorSection.style.display = 'block';
            return;
        }
        
        try {
            templatesList.innerHTML = '<div class="loading">テンプレート一覧を読み込み中...</div>';
            templatesListSection.style.display = 'block';
            
            // Make sure both columns are visible in the layout
            document.querySelector('.two-column-layout').style.display = 'flex';
            
            const templates = await fetchLabelmakeTemplates(labelmakeApiKey);
            displayTemplatesList(templates);
        } catch (err) {
            console.error('Error fetching templates:', err);
            errorMessage.textContent = `エラー: ${err.message}`;
            errorSection.style.display = 'block';
            templatesListSection.style.display = 'none';
        }
    });
    
    registerBtn.addEventListener('click', async function() {
        const templateName = templateNameInput.value.trim();
        const templateDescription = templateDescriptionInput.value.trim();
        const templateTags = templateTagsInput.value.trim();
        const templateSchema = templateSchemaInput.value.trim();
        
        if (!templateName) {
            errorMessage.textContent = 'テンプレート名を入力してください。';
            errorSection.style.display = 'block';
            return;
        }
        
        if (!templateSchema) {
            errorMessage.textContent = 'スキーマを入力してください。';
            errorSection.style.display = 'block';
            return;
        }
        
        if (!pdfmeApiKey) {
            errorMessage.textContent = 'pdfme APIキーを入力してください。';
            errorSection.style.display = 'block';
            return;
        }
        
        try {
            // スキーマをJSONとして解析
            let schemaData;
            try {
                schemaData = JSON.parse(templateSchema);
            } catch (err) {
                throw new Error('スキーマの形式が正しくありません。有効なJSONを入力してください。');
            }
            
            // pdfmeテンプレートの作成
            let basePdf = null;
            if (schemaData.basePdf) {
              // URLからダウンロードしbase64に変換する
              basePdf = await convertBasePdfToBase64(schemaData.basePdf)
            }
            const pdfmeTemplate = {
                metaData: {
                  title: templateName,
                  description: templateDescription,
                  tags: templateTags.split(',').map(tag => tag.trim()).filter(tag => tag),
                  status: "published",
                },
                templateData: {
                  schemas: schemaData.schemas || [],
                  basePdf: schemaData.basePdf || null
                },
            };
            
            // ローカルのコピーにAPIキーを追加（ダウンロード用）
            const templateWithApiKeys = {
                ...pdfmeTemplate,
                apiKeys: {}
            };
            
            // APIキーが設定されている場合は追加
            if (labelmakeApiKey) {
                templateWithApiKeys.apiKeys.labelmake = labelmakeApiKey;
            }
            
            if (pdfmeApiKey) {
                templateWithApiKeys.apiKeys.pdfme = pdfmeApiKey;
            }
            
            // pdfme APIにテンプレートを登録
            registerBtn.disabled = true;
            registerBtn.textContent = '登録中...';
            
            const registeredTemplate = await registerTemplateToPdfme(pdfmeTemplate, pdfmeApiKey);
            
            // 登録成功
            convertedTemplate = templateWithApiKeys;
            
            // プレビュー表示
            showPreview(convertedTemplate);
            
            templateInfo.textContent = `テンプレート名: ${templateName} (ID: ${registeredTemplate.id})`;
            resultSection.style.display = 'block';
            errorSection.style.display = 'none';
            
            // ボタンを元に戻す
            registerBtn.disabled = false;
            registerBtn.textContent = 'pdfmeにテンプレートを登録';
        } catch (err) {
            console.error('Error processing template:', err);
            errorMessage.textContent = `エラー: ${err.message}`;
            resultSection.style.display = 'none';
            errorSection.style.display = 'block';
            
            // ボタンを元に戻す
            registerBtn.disabled = false;
            registerBtn.textContent = 'pdfmeにテンプレートを登録';
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
        // pdfmeのテンプレート構造を作成
        const pdfmeTemplate = {
            columns: labelmakeTemplate.columns,
            schemas: labelmakeTemplate.schemas,
            basePdf: labelmakeTemplate.basePdf || null,
        };
        
        // labelmakeのフィールドをpdfmeのスキーマに変換
        //if (labelmakeTemplate.template.schemas) {
        //    labelmakeTemplate.template.schemas.forEach(schema => {
        //        const pdfmeSchema = {
        //            type: mapFieldType(schema.type),
        //            position: {
        //                x: schema.position.x,
        //                y: schema.position.y
        //            },
        //            width: schema.width,
        //            height: schema.height,
        //            name: schema.key,
        //            // pdfmeの追加プロパティ
        //            alignment: mapAlignment(schema.align),
        //            fontSize: schema.fontSize || 12,
        //            fontColor: schema.fontColor || '#000000',
        //            backgroundColor: schema.backgroundColor || null,
        //            page: schema.page || 1
        //        };
        //        
        //        pdfmeTemplate.schemas.push(pdfmeSchema);
        //    });
        //}
        
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

    // URLからPDFをダウンロードしbase64に変換
    async function convertBasePdfToBase64(url) {
      return null;
    }
    
    // pdfmeにテンプレートを登録
    async function registerTemplateToPdfme(template, apiKey) {
        if (!apiKey) {
            throw new Error('pdfme APIキーが設定されていません。');
        }
        
        const response = await fetch('https://api.pdfme.com/v1/templates', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(template)
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('APIキーが無効です。正しいpdfme APIキーを入力してください。');
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`テンプレートの登録に失敗しました。ステータスコード: ${response.status}, エラー: ${errorData.message || 'Unknown error'}`);
        }
        
        return await response.json();
    }
    
    // labelmakeからテンプレート一覧を取得
    async function fetchLabelmakeTemplates(apiKey) {
        const response = await fetch('https://api.labelmake.jp/v1/templates', {
            method: 'GET',
            headers: {
              'X-Labelmake-API-Token': apiKey,
              'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('APIキーが無効です。正しいlabelmake APIキーを入力してください。');
            }
            throw new Error(`テンプレート一覧の取得に失敗しました。ステータスコード: ${response.status}`);
        }
        
        return await response.json();
    }
    
    // テンプレート一覧のグローバル変数
    let templates = [];
    
    // テンプレート一覧を表示
    function displayTemplatesList(templatesData) {
        // グローバル変数に保存
        templates = templatesData;
        if (!templates || templates.length === 0) {
            templatesList.innerHTML = '<p>テンプレートが見つかりませんでした。</p>';
            return;
        }
        
        let html = '';
        templates.forEach(template => {
            html += `
                <div class="template-item" data-id="${template.id}">
                    <div class="template-info">
                        <div class="template-name">${template.name || 'No Name'}</div>
                    </div>
                    <button class="template-select-btn" data-id="${template.id}">選択</button>
                </div>
            `;
        });
        
        templatesList.innerHTML = html;
        
        // テンプレート選択ボタンのイベントリスナーを追加
        document.querySelectorAll('.template-select-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const templateId = this.getAttribute('data-id');
                try {
                    // 選択されたテンプレートを一覧から見つける
                    const selectedTemplate = templates.find(template => template.id === templateId);
                
                    if (!selectedTemplate) {
                        throw new Error('選択されたテンプレートが見つかりません。');
                    }
                
                    // テンプレートを変換
                    convertedTemplate = convertLabelmakeToPdfme(selectedTemplate);
                
                    // プレビュー表示
                    showPreview(convertedTemplate);
                
                    // テンプレート情報を表示
                    templateInfo.textContent = `テンプレート名: ${selectedTemplate.name || 'No Name'}`;
                
                    // テンプレート名をフォームに設定
                    templateNameInput.value = selectedTemplate.name || '';
                    
                    // 説明をフォームに設定
                    templateDescriptionInput.value = selectedTemplate.description || '';
                
                    // タグがあれば設定
                    if (selectedTemplate.tags && Array.isArray(selectedTemplate.tags)) {
                        templateTagsInput.value = selectedTemplate.tags.join(', ');
                    }
                
                    // スキーマをJSONとして設定
                    const schemaData = {
                        schemas: convertedTemplate.schemas || [],
                        basePdf: convertedTemplate.basePdf || null
                    };
                    templateSchemaInput.value = JSON.stringify(schemaData, null, 2);
                
                    // APIキーをテキストフィールドに設定
                    if (convertedTemplate.apiKeys) {
                        if (convertedTemplate.apiKeys.labelmake) {
                            labelmakeApiKeyInput.value = convertedTemplate.apiKeys.labelmake;
                            labelmakeApiKey = convertedTemplate.apiKeys.labelmake;
                            sessionStorage.setItem('labelmakeApiKey', labelmakeApiKey);
                        }
                    
                        if (convertedTemplate.apiKeys.pdfme) {
                            pdfmeApiKeyInput.value = convertedTemplate.apiKeys.pdfme;
                            pdfmeApiKey = convertedTemplate.apiKeys.pdfme;
                            sessionStorage.setItem('pdfmeApiKey', pdfmeApiKey);
                        }
                    }
                
                    resultSection.style.display = 'block';
                    errorSection.style.display = 'none';
                } catch (err) {
                    console.error('Error processing template:', err);
                    errorMessage.textContent = `エラー: ${err.message}`;
                    errorSection.style.display = 'block';
                }
            });
        });
    }
    
});
