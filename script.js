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
    const loadTemplatesBtn = document.getElementById('load-templates-btn');
    const templatesListSection = document.getElementById('templates-list-section');
    const templatesList = document.getElementById('templates-list');
    const downloadBtn = document.getElementById('download-btn');
    
    let convertedTemplate = null;
    let labelmakeApiKey = '';
    let pdfmeApiKey = '';
    
    // ダウンロードボタンのイベントリスナー
    downloadBtn.addEventListener('click', function() {
        if (!convertedTemplate) {
            errorMessage.textContent = 'ダウンロードするテンプレートがありません。';
            errorSection.style.display = 'block';
            return;
        }
        
        // JSONをBlobに変換
        const templateJson = JSON.stringify(convertedTemplate, null, 2);
        const blob = new Blob([templateJson], { type: 'application/json' });
        
        // ダウンロードリンクを作成
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${convertedTemplate.metaData?.title || 'template'}.json`;
        document.body.appendChild(a);
        a.click();
        
        // クリーンアップ
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    });
    
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
            let basePdf = {
                "width": 210,
                "height": 297,
                "padding": [
                    10,
                    10,
                    10,
                    10
                ]
            };
            if (schemaData.basePdf) {
              try {
                // URLからダウンロードしbase64に変換する
                basePdf = await convertBasePdfToBase64(schemaData.basePdf);
                console.log('BasePDF converted to base64 successfully');
              } catch (err) {
                console.error('Error converting basePdf:', err);
                throw new Error(`ベースPDFの変換に失敗しました: ${err.message}`);
              }
            }
            
            const pdfmeTemplate = {
                metaData: {
                  title: templateName,
                  description: templateDescription,
                  tags: templateTags.split(',').map(tag => tag.trim()).filter(tag => tag),
                  status: "published",
                },
                templateData: {
                  schemas: convertSchemas(schemaData),
                  basePdf: basePdf
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
    
    // labelmakeのテンプレートをpdfmeのテンプレートに変換
    function convertLabelmakeToPdfme(labelmakeTemplate) {
        // pdfmeのテンプレート構造を作成
        const pdfmeTemplate = {
            columns: labelmakeTemplate.columns,
            sampledata: labelmakeTemplate.sampledata,
            schemas: labelmakeTemplate.schemas,
            basePdf: labelmakeTemplate.basePdf || null,
        };
               
        return pdfmeTemplate;
    }
    
    // labelmakeのフィールドタイプをpdfmeのタイプにマッピング
    function mapFieldType(labelmakeType) {
        const typeMap = {
            'text': 'text',
            'image': 'image',
            'qrcode': 'qrcode',
            'barcode': 'qrcode', // pdfmeではbarcodeもqrcodeとして扱う
            'checkbox': 'text',  // pdfmeにはcheckboxがないのでtextで代用
            'radio': 'text'      // pdfmeにはradioがないのでtextで代用
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
   
    // URLからPDFをダウンロードしbase64に変換
    async function convertBasePdfToBase64(url) {
      try {
        // URLからPDFをフェッチ
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`PDFのダウンロードに失敗しました。ステータスコード: ${response.status}`);
        }
        
        // レスポンスをBlobとして取得
        const blob = await response.blob();
        
        // BlobをBase64に変換
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // data:application/pdf;base64, の部分を削除して純粋なbase64文字列を取得
            const base64data = reader.result.split(',')[1];
            resolve(base64data);
          };
          reader.onerror = () => {
            reject(new Error('PDFのBase64変換に失敗しました。'));
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Base64変換エラー:', error);
        throw new Error(`PDFのBase64変換に失敗しました: ${error.message}`);
      }
    }

    // schemasをlabelmakeからpdfmeの仕様に変換する
		// labelmakeのスキーマ例
		//[
	//	{
		//		"field1": {
		//			alignment: "left",
		//			backgroundColor: "",
		//			characterSpacing: 0,
		//			fontColor: "",
		//			fontSize: 18,
		//			height: 16,
		//			lineHeight: 1,
		//			position: {x: 29, y: 15.5},
		//			type: "qrcode",
		//			width: 16,
	//		}
		//	}
		//]
		//
		// pdfmeのスキーマ例
		//[
		//  [
		//    {
		//      "name": "field1",
		//      "type": "text",
		//      "content": "", // sampledata
		//      "position": {
		//        "x": 61.59,
		//        "y": 52.86
		//      },
		//      "width": 45,
		//      "height": 10,
		//      "rotate": 0,
		//      "alignment": "left",
		//      "verticalAlignment": "top",
		//      "fontSize": 13,
		//      "lineHeight": 1,
		//      "characterSpacing": 0,
		//      "fontColor": "#000000",
		//      "backgroundColor": "",
		//      "opacity": 1,
		//      "strikethrough": false,
		//      "underline": false,
		//      "required": false
		//    }
		//  ]
		//]
    function convertSchemas(schemaData) {
      const schemas = schemaData.schemas;
      if (!schemas || !Array.isArray(schemas) || schemas.length === 0) {
        return [[]]; // 空のスキーマを返す
      }
      
      // pdfmeのスキーマは[[]]の形式なので、最初の配列を作成
      const pdfmeSchemas = [[]];

      const sampledata = schemaData.sampledata && schemaData.sampledata.length > 0 ? schemaData.sampledata[0] : {};
      
      // labelmakeのスキーマを処理
      schemas.forEach(schemaObj => {
        // 各オブジェクトのキーを処理
        Object.keys(schemaObj).forEach(fieldName => {
          const fieldData = schemaObj[fieldName];
          
          // フィールドタイプのマッピング
          let fieldType = 'text'; // デフォルトはtext
          if (fieldData.type) {
            if (fieldData.type === 'qrcode' || fieldData.type === 'barcode') {
              fieldType = 'qrcode';
            } else if (fieldData.type === 'image') {
              fieldType = 'image';
            }
          }
          
          // pdfmeのフィールド形式に変換
          const pdfmeField = {
            name: fieldName,
            type: fieldType,
            content: sampledata[fieldName] || '',
            position: {
              x: fieldData.position ? fieldData.position.x : 0,
              y: fieldData.position ? fieldData.position.y : 0
            },
            width: fieldData.width || 45,
            height: fieldData.height || 10,
            rotate: 0,
            alignment: fieldData.alignment || 'left',
            verticalAlignment: 'top',
            fontSize: fieldData.fontSize || 13,
            lineHeight: fieldData.lineHeight || 1,
            characterSpacing: fieldData.characterSpacing || 0,
            fontColor: fieldData.fontColor || '#000000',
            backgroundColor: fieldData.backgroundColor || '',
            opacity: 1,
            strikethrough: false,
            underline: false,
            required: false
          };
          
          // ページ情報があれば追加
          if (fieldData.page) {
            // pdfmeでは0ベースのページ番号、labelmakeは1ベース
            const pageIndex = parseInt(fieldData.page) - 1;
            
            // 必要なページ配列を確保
            while (pdfmeSchemas.length <= pageIndex) {
              pdfmeSchemas.push([]);
            }
            
            // 該当ページにフィールドを追加
            pdfmeSchemas[pageIndex].push(pdfmeField);
          } else {
            // ページ情報がない場合は最初のページに追加
            pdfmeSchemas[0].push(pdfmeField);
          }
        });
      });
      
      return pdfmeSchemas;
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
                        sampledata: convertedTemplate.sampledata || {},
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
