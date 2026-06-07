import urllib.request
import json
import os
import re

url = "http://localhost:2283"
api_key = "cvbYePXAFW2fwF4YN5bwPhKBQC0KQ7sAttEC6sVWft4"
person_id = "22be926a-0f60-4e03-9650-1103c79ab58a"

base_dir = r"D:\AI\ZhengMingfu"
album_js_path = os.path.join(base_dir, "album-data.js")

def api_post(path, body):
    req = urllib.request.Request(
        f"{url}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def api_get(path):
    req = urllib.request.Request(
        f"{url}{path}",
        headers={"x-api-key": api_key}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def download_file(path, dest_path):
    req = urllib.request.Request(
        f"{url}{path}",
        headers={"x-api-key": api_key}
    )
    with urllib.request.urlopen(req) as res:
        # Check content type to make sure it's an image
        content_type = res.headers.get("Content-Type", "")
        # Save file
        with open(dest_path, "wb") as f:
            f.write(res.read())
        return content_type

def get_good_title(filename, year):
    if not filename:
        return f"{year}年留影" if year and year != "待补" and year != "旧照" else "珍贵留影"
    base = os.path.splitext(filename)[0]
    # Check if base is a timestamp/camera name like 20171108_134054 or IMG_20180430_172548
    if re.match(r'^(IMG_)?\d{8}_\d{6}.*$', base, re.I) or re.match(r'^\d+$', base) or re.match(r'^IMG_\d+$', base, re.I):
        if year and year != "待补" and year != "旧照":
            return f"{year}年留影"
        else:
            return "珍贵留影"
    return base

def main():
    print("=== 开始从本地 Immich 导入‘郑明富’照片 ===")
    
    # 1. 获取已有的 album-data.js 内容以进行排重
    existing_content = ""
    if os.path.exists(album_js_path):
        with open(album_js_path, "r", encoding="utf-8") as f:
            existing_content = f.read()
    
    # 2. 查询人物照片资源
    print(f"正在获取人物 (ID: {person_id}) 的媒体列表...")
    search_result = api_post("/api/search/metadata", {"personIds": [person_id]})
    
    assets = []
    if isinstance(search_result, list):
        assets = search_result
    elif isinstance(search_result, dict):
        assets = search_result.get("items", search_result.get("assets", {}).get("items", []))
        if not assets and "assets" in search_result and isinstance(search_result["assets"], list):
            assets = search_result["assets"]
            
    print(f"Immich 数据库中该人物关联的总媒体数: {len(assets)}")
    
    image_assets = [a for a in assets if a.get("type") == "IMAGE"]
    print(f"其中图片类型的资源数: {len(image_assets)}")
    
    new_entries = []
    success_count = 0
    skip_count = 0
    
    # 3. 循环处理每个图片资源
    for index, summary_asset in enumerate(image_assets):
        asset_id = summary_asset.get("id")
        
        # 检查是否已导入过 (以 id 作为标志)
        # 检查 src 路径中是否包含该 id
        if f"immich-{asset_id}" in existing_content:
            skip_count += 1
            continue
            
        print(f"[{index+1}/{len(image_assets)}] 正在处理资源 {asset_id}...")
        
        # 获取详细的 EXIF 和文件名信息
        try:
            detail = api_get(f"/api/assets/{asset_id}")
        except Exception as e:
            print(f"  获取资源详情失败 {asset_id}: {e}")
            continue
            
        original_filename = detail.get("originalFileName", "")
        # 解密乱码？如果 originalFileName 为空，使用 id
        if not original_filename:
            original_filename = f"immich-{asset_id}"
            
        # 获取拍摄年份
        exif = detail.get("exifInfo", {})
        date_str = exif.get("dateTimeOriginal") or detail.get("fileCreatedAt") or detail.get("localDateTime")
        year = "待补"
        year_num = None
        if date_str:
            match = re.match(r'^(\d{4})', date_str)
            if match:
                year = match.group(1)
                try:
                    year_num = int(year)
                except ValueError:
                    pass
                    
        # 智能分类逻辑
        category = "生活"
        folder = "life"
        
        # 检查原始文件名关键字
        lower_name = original_filename.lower()
        
        # 修复 mojibake 关键字检查
        # 乱码转换或者在设备资产名检查中做
        device_id = detail.get("deviceAssetId", "").lower()
        
        is_family = "全家福" in original_filename or "family" in lower_name or "大家庭" in original_filename or "全家福" in device_id or "family" in device_id
        is_group = "合影" in original_filename or "聚会" in lower_name or "与" in original_filename or "合影" in device_id or "group" in device_id
        is_old = "旧照" in original_filename or "老照片" in original_filename or "old" in lower_name or "旧照" in device_id or "old" in device_id
        
        # 如果拍摄年份在 2000 年以前，且不是合影/家庭，也优先归入旧照
        if year_num and year_num < 2000:
            is_old = True
            
        if is_family:
            category = "家庭"
            folder = "family"
        elif is_group:
            category = "合影"
            folder = "group"
        elif is_old:
            category = "旧照"
            folder = "old"
            if year == "待补":
                year = "旧照"
                
        # 准备下载路径
        # 为了兼容性，使用 preview 大小，通常是 webp 格式或 jpeg 格式
        # 先下载到一个临时路径，根据 Content-Type 决定最终后缀
        temp_dest = os.path.join(base_dir, "images", "album", folder, f"temp-{asset_id}")
        dest_folder = os.path.join(base_dir, "images", "album", folder)
        os.makedirs(dest_folder, exist_ok=True)
        
        try:
            content_type = download_file(f"/api/assets/{asset_id}/thumbnail?size=preview", temp_dest)
            ext = ".webp"
            if "jpeg" in content_type.lower() or "jpg" in content_type.lower():
                ext = ".jpg"
            elif "png" in content_type.lower():
                ext = ".png"
                
            final_filename = f"immich-{asset_id}{ext}"
            final_dest = os.path.join(dest_folder, final_filename)
            
            # 重命名为带后缀的最终文件
            if os.path.exists(final_dest):
                os.remove(final_dest)
            os.rename(temp_dest, final_dest)
            
            # 生成相册信息
            title = get_good_title(original_filename, year)
            
            # 去除乱码标题的异常
            # 如果标题含有乱码字符，替换为默认名
            if any(ord(c) > 65533 for c in title) or "\\" in title or "/" in title:
                title = f"{year}年留影" if year != "待补" and year != "旧照" else "珍贵留影"
                
            entry = {
                "src": f"images/album/{folder}/{final_filename}",
                "title": title,
                "year": year,
                "category": category,
                "caption": "从 Immich 本地照片库导入的珍贵记忆。"
            }
            new_entries.append(entry)
            success_count += 1
            print(f"  成功导入: {title} ({year}) -> {entry['src']}")
        except Exception as e:
            print(f"  下载/处理资源失败 {asset_id}: {e}")
            if os.path.exists(temp_dest):
                os.remove(temp_dest)
                
    # 4. 追加写入数据到 album-data.js
    if new_entries:
        print(f"\n正在将 {len(new_entries)} 条新照片记录写入 album-data.js...")
        
        # 寻找已有的数组结束符号 "];" 并在此之前插入
        # window.memorialAlbum = [ ... ];
        js_end_idx = existing_content.rfind("];")
        if js_end_idx != -1:
            # 格式化新的 JS 对象字符串
            new_js_blocks = []
            for entry in new_entries:
                block = "    {\n"
                block += f'        src: "{entry["src"]}",\n'
                block += f'        title: "{entry["title"]}",\n'
                block += f'        year: "{entry["year"]}",\n'
                block += f'        category: "{entry["category"]}",\n'
                block += f'        caption: "{entry["caption"]}"\n'
                block += "    }"
                new_js_blocks.append(block)
                
            # 拼接，如果前面有元素，添加逗号
            # 检查 ]; 前面是不是有其他非空字符并且不是 [
            prefix_content = existing_content[:js_end_idx].rstrip()
            separator = ",\n"
            if prefix_content.endswith("["):
                separator = "\n"
                
            insertion = separator + ",\n".join(new_js_blocks) + "\n"
            updated_content = prefix_content + insertion + existing_content[js_end_idx:]
            
            with open(album_js_path, "w", encoding="utf-8") as f:
                f.write(updated_content)
                
            print("album-data.js 更新成功！")
        else:
            print("错误: 无法在 album-data.js 中找到数组结束符 '];'")
    else:
        print("\n没有新照片需要导入。")
        
    print(f"\n工作完成! 成功导入: {success_count} 张, 跳过已存在: {skip_count} 张.")

if __name__ == '__main__':
    main()
