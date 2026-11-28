<div align="center">
  <img src="docs/logo-can.svg" alt="Cantonese Voice Studio CAN 標誌" width="112" height="112" />
  <h1>Cantonese Voice Studio</h1>
  <p><strong>廣東話語音複製 · 本地文字轉語音 · 六聲修音</strong></p>
  <p>專為 Apple Silicon Mac 而設嘅離線廣東話配音工具。</p>
  <p><a href="README.md">English</a> · <strong>繁體中文（香港）</strong></p>
  <p>
    <a href="https://github.com/blackjack2806969/VoiceStudio/releases"><strong>下載 macOS 版本</strong></a> ·
    <a href="#實際介面">實際介面</a> ·
    <a href="#快速上手">快速上手</a> ·
    <a href="https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md">技術文件（英文）</a>
  </p>
  <p><code>macOS arm64</code> · <code>OmniVoice</code> · <code>Praat / PSOLA</code> · <code>本地運算</code></p>
</div>

---

## 關於 Cantonese Voice Studio

本專案係 [VoiceStudio](https://github.com/debpalash/VoiceStudio) 嘅獨立廣東話特化版本，專注香港廣東話配音：匯入獲授權嘅參考聲音、生成廣東話及中英夾雜語音、修正個別音節嘅聲調，再輸出完成品。

本版本只採用 OmniVoice 作為語音生成引擎。安裝模型之後，語音生成同修音都喺本機進行，唔需要雲端推理服務或者付費 API 額度。

> [!TIP]
> **最重要嘅使用建議：一次 Render 完整句子，唔好逐一兩個字生成。**
>
> 完整語境有助 OmniVoice 生成更自然嘅廣東話發音、節奏同語調。例如唔好將「聽日」、「開會」分開生成，而係一次過輸入「聽日朝早九點要開會，記得準時返嚟。」
>
> 如果個別字讀錯聲調，先生成成句，再用 Pitch Editor 修正嗰個字；如果需要重新生成，亦建議 Render 成句，而唔係逐字剪接。

## 實際介面

以下係 v0.3.0 macOS ARM64 打包測試截圖，並非設計示意圖。

### 語音複製（Clone）

[![v0.3.0 語音複製介面](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-01-clone.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-01-clone.png)

### 廣東話修音（Cantonese Pitch Editor）

[![v0.3.0 廣東話修音介面](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-02-cantonese-pitch-editor.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-02-cantonese-pitch-editor.png)

<details>
<summary>查看更多介面截圖：已儲存聲線、歷史紀錄及設定</summary>

### 已儲存聲線

[![已儲存聲線](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-03-saved-voices.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-03-saved-voices.png)

### 歷史紀錄

[![歷史紀錄](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-04-history.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-04-history.png)

### 設定

[![設定](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-05-settings.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-05-settings.png)

</details>

[查看完整 v0.3.0 發佈及截圖](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.3.0)

## 兩大核心功能

| 語音複製（Voice Clone） | 廣東話修音（Pitch Editor） |
| --- | --- |
| 利用參考錄音進行零樣本語音複製 | 喺波形上選取個別音節 |
| 支援廣東話及中英夾雜文字 | 廣東話六聲預設 |
| 儲存聲線及調整語速 | 手動 F0 音高控制點及半音調整 |
| 試聽及輸出生成語音 | 非破壞性編輯、復原、前後試聽及 WAV 輸出 |

### 廣東話六聲修正

同唱歌用嘅 Auto-Tune 唔同，呢個修音工具係專為口語廣東話而設，利用 Praat PSOLA 技術，按講者本身嘅音高範圍調整聲調，而唔係將聲音拉去音樂音階。

| 聲調 | 例字 | 音高走勢 |
| :---: | :---: | --- |
| 第一聲 | 詩（si1） | 55 · 高平 |
| 第二聲 | 史（si2） | 25 · 高升 |
| 第三聲 | 試（si3） | 33 · 中平 |
| 第四聲 | 時（si4） | 21 · 低降 |
| 第五聲 | 市（si5） | 23 · 低升 |
| 第六聲 | 事（si6） | 22 · 低平 |

選取音節後，可以套用預設或者手動調整音高控制點，再比較修正前後嘅聲音。原始錄音唔會被覆蓋。修音功能只調整音高，唔會修正聲母、韻母，亦唔會自動識別所有讀音錯誤。

## 下載及系統需求

**[前往本專案 Releases 下載 macOS ARM64 安裝包](https://github.com/blackjack2806969/VoiceStudio/releases)**

選擇最新已發佈嘅 OmniVoice-only 版本，下載 `.dmg` 檔案。

- 適用平台：Apple Silicon Mac（M 系列）。
- DMG 已包含 App、Python 執行環境、OmniVoice 引擎及 FFmpeg。
- OmniVoice 模型權重（約 2.4 GiB）**未包含喺 DMG**。首次使用 Clone 時下載一次，或者重用已有嘅完整 Hugging Face 模型快取。
- Pitch Editor 唔需要安裝任何 TTS 模型。
- 安裝包採用 ad-hoc 簽署，未經 Apple Developer ID 公證。請遵守所屬機構嘅安裝及資訊保安政策。

## 快速上手

1. 開啟 DMG，將 App 安裝到 Applications。
2. 開啟 **Clone**。如果未有模型，撳 **Download OmniVoice** 完成一次性下載。
3. 閱讀並確認模型授權條款。
4. 匯入一段約 5–15 秒、清晰而且已獲講者授權嘅參考錄音，輸入準確逐字稿。
5. 選擇 Cantonese，輸入完整句子，例如：`聽日開 meeting，記得帶 laptop。我哋九點見。`，再生成語音。
6. 試聽後，撳 **Edit Pitch** 直接開啟廣東話修音介面，選取音節、修正聲調並輸出 WAV。

v0.3.0 支援直接由 Clone 同 History 開啟修音工具。舊版 v0.2.0 則需要先輸出生成語音，再經 **Tools → Cantonese lexical tones** 匯入修音。

如需繁體中文介面，可喺 Settings 嘅語言設定選擇繁體中文。未安裝語音辨識模型時，可以手動輸入參考錄音逐字稿。

### 重用模型快取及離線安裝

App 可以重用完整嘅 `k2-fsa/OmniVoice` Hugging Face 模型快取。對於離線 Mac，可以將完整嘅 `models--k2-fsa--OmniVoice` 資料夾移到 `~/.cache/huggingface/hub`，保留 blobs、snapshots 同相對符號連結。

詳細步驟請參考[安裝及操作指南（英文）](https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md)。

## 版本及測試狀態

| 版本 | 狀態 |
| --- | --- |
| [v0.2.0](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.2.0) | 已發佈 OmniVoice-only ARM64 安裝包，通過打包後 CI 測試 |
| [v0.3.0](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.3.0) | 已發佈 ARM64 安裝包；五個精簡工作區、直接 Edit Pitch、通過打包後 CI 測試 |

v0.3.0 嘅發佈測試已驗證模型設定、離線語音複製、Clone 同 History 嘅 Edit Pitch、播放、復原及 WAV 輸出。

v0.2.0 嘅 [macOS ARM64 CI 測試](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45981656040) 已驗證模型下載、快取重用、本地中英夾雜語音複製、手動 F0 編輯、播放、復原及 WAV 輸出。

[下載 v0.2.0 測試截圖及音訊](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45981656040/artifacts/15190228799)（GitHub Actions 測試產物，可能需要登入）。

CI 測試唔代表已驗證實體 M1 Ultra 嘅運算效能、廣東話發音質素或者聲線相似度，仍然需要實機試聽及測試。

## 原始碼及技術文件

廣東話版本嘅實作位於 [`cantonese-offline` 分支](https://github.com/blackjack2806969/VoiceStudio/tree/cantonese-offline)。預設分支用作專案主頁並保留上游程式碼基礎；開發時請使用廣東話版本分支或者指定版本標籤。

- [安裝、模型設定及修音操作指南（英文）](https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md)
- [開發進度及測試紀錄（英文）](https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/DEVELOPMENT_STATUS.md)
- [回報本專案問題](https://github.com/blackjack2806969/VoiceStudio/issues)

## 授權及鳴謝

- App：採用 [AGPL-3.0](LICENSE)，保留上游版權、授權聲明及原始碼歷史。詳見 [LICENSE-NOTICE.md](LICENSE-NOTICE.md)。
- OmniVoice 模型權重：[CC BY-NC，僅限非商業用途](https://huggingface.co/k2-fsa/OmniVoice/blob/c5fdb5ccb189668d56333f77ba2629f4cd7535f4/README.md)。音訊 tokenizer 另受 [Higgs Audio 2 及 Meta Llama 3 條款](https://huggingface.co/k2-fsa/OmniVoice/blob/c5fdb5ccb189668d56333f77ba2629f4cd7535f4/audio_tokenizer/LICENSE) 約束。App 授權唔會取代模型授權。
- 音高處理：[Praat-Parselmouth](https://github.com/YannickJadoul/Parselmouth)，GPL-3.0-or-later。

本專案建基於 [Palash Debnath](https://github.com/debpalash)、[Shimul Debnath](https://github.com/velixio) 同 [VoiceStudio 貢獻者](https://github.com/debpalash/VoiceStudio/graphs/contributors) 嘅成果，並感謝 OmniVoice、Praat 同 Parselmouth 嘅原作者及開發者。

本專案係獨立衍生版本，並非 VoiceStudio 官方版本。請只複製已獲授權嘅聲音，切勿用於冒認身份、詐騙或其他違法用途。
