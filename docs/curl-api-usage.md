# curl 远程操作说明

这份文档用于通过 curl 远程操作在线笔记。示例里不要写真实密钥到仓库，使用时在本机 shell 里临时替换即可。

## 准备变量

```bash
export BASE="http://你的服务器地址:31300"
export API_KEY="np_live_xxx"
```

如果是在 Windows PowerShell 中使用：

```powershell
$env:BASE = "http://你的服务器地址:31300"
$env:API_KEY = "np_live_xxx"
```

## 获取笔记列表

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/notes"
```

PowerShell：

```powershell
curl.exe -sS `
  -H "Authorization: Bearer $env:API_KEY" `
  "$env:BASE/api/notes"
```

## 按编号获取笔记 JSON

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/notes/by-number/N0005"
```

PowerShell：

```powershell
curl.exe -sS `
  -H "Authorization: Bearer $env:API_KEY" `
  "$env:BASE/api/notes/by-number/N0005"
```

## 按编号获取 Markdown 正文

直接输出正文：

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/notes/by-number/N0005/raw"
```

保存为本地文件：

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/notes/by-number/N0005/raw" \
  -o note-N0005.md
```

PowerShell：

```powershell
curl.exe -sS `
  -H "Authorization: Bearer $env:API_KEY" `
  "$env:BASE/api/notes/by-number/N0005/raw" `
  -o note-N0005.md
```

## 新建笔记

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"远程上传笔记","content":"# 标题\n\n这里是正文"}' \
  "$BASE/api/notes"
```

PowerShell：

```powershell
curl.exe -sS `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"title":"远程上传笔记","content":"# 标题\n\n这里是正文"}' `
  "$env:BASE/api/notes"
```

## 修改笔记

修改笔记需要使用笔记的 `id`。可以先通过编号获取：

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/notes/by-number/N0005"
```

从返回结果里找到 `note.id`，再更新：

```bash
curl -sS \
  -X PATCH \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"新标题","content":"# 新正文"}' \
  "$BASE/api/notes/笔记ID"
```

PowerShell：

```powershell
curl.exe -sS `
  -X PATCH `
  -H "Authorization: Bearer $env:API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"title":"新标题","content":"# 新正文"}' `
  "$env:BASE/api/notes/笔记ID"
```

## 上传附件

附件上传目前需要 `noteId`，不是 `N0005` 这种编号。先通过编号接口拿到 `note.id`，再上传：

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  -F "noteId=笔记ID" \
  -F "file=@./example.pdf" \
  "$BASE/api/attachments"
```

PowerShell：

```powershell
curl.exe -sS `
  -H "Authorization: Bearer $env:API_KEY" `
  -F "noteId=笔记ID" `
  -F "file=@./example.pdf" `
  "$env:BASE/api/attachments"
```

上传成功后会返回附件信息，例如附件名、大小、附件 ID 等。

## 导出全部笔记和附件

```bash
curl -L \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/export" \
  -o online-notepad-backup.zip
```

PowerShell：

```powershell
curl.exe -L `
  -H "Authorization: Bearer $env:API_KEY" `
  "$env:BASE/api/export" `
  -o online-notepad-backup.zip
```

导出的 ZIP 里包含笔记数据和附件文件。当前版本还没有单独下载某个附件的 API，如果要取附件文件，先导出 ZIP。

## 上传 ZIP 导入

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./online-notepad-backup.zip" \
  "$BASE/api/import"
```

PowerShell：

```powershell
curl.exe -sS `
  -H "Authorization: Bearer $env:API_KEY" `
  -F "file=@./online-notepad-backup.zip" `
  "$env:BASE/api/import"
```

## 常见状态码

- `200`：请求成功。
- `201`：创建成功，例如新建笔记或上传附件。
- `400`：请求格式不对，常见于缺少文件、JSON 格式错误、附件超过大小限制。
- `401`：API Key 缺失、错误或已删除。
- `404`：笔记不存在。

