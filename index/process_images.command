#!/bin/zsh

# Double-click runner for resizing images in this folder.
script_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$script_dir" || exit 1

setopt NULL_GLOB

files=(*.jpg *.JPG *.jpeg *.JPEG *.png *.PNG)
if (( ${#files[@]} == 0 )); then
  echo "No jpg/png files found in: $script_dir"
  exit 0
fi

raw_dir="raw"

ensure_raw_dir() {
  [[ -d "$raw_dir" ]] || mkdir -p "$raw_dir"
}

move_to_raw() {
  local src="$1"
  local name="$src"
  local base="${name:r}"
  local ext="${name:e}"
  local dest="$raw_dir/$name"
  local i=1

  ensure_raw_dir

  while [[ -e "$dest" ]]; do
    dest="$raw_dir/${base}_$i.$ext"
    ((i++))
  done

  mv "$src" "$dest"
}

pick_output_jpg_name() {
  local stem="$1"
  local candidate="${stem}.jpg"
  local i=1

  while [[ -e "$candidate" ]]; do
    candidate="${stem}_$i.jpg"
    ((i++))
  done

  echo "$candidate"
}

for file in "${files[@]}"; do
  width="$(sips -g pixelWidth "$file" 2>/dev/null | awk '/pixelWidth:/ {print $2; exit}')"
  height="$(sips -g pixelHeight "$file" 2>/dev/null | awk '/pixelHeight:/ {print $2; exit}')"

  if [[ -z "$width" || -z "$height" ]]; then
    echo "[SKIP] $file | failed to read dimensions"
    continue
  fi

  long_edge=$(( width > height ? width : height ))
  ext_lc="${${file:e}:l}"
  stem="${file:r}"

  if [[ "$ext_lc" == "png" ]]; then
    out_jpg="$(pick_output_jpg_name "$stem")"
    tmp_out="${out_jpg}.tmp.$$"

    if (( long_edge > 960 )); then
      if sips --resampleHeightWidthMax 960 --setProperty format jpeg "$file" --out "$tmp_out" >/dev/null 2>&1; then
        mv "$tmp_out" "$out_jpg"
        move_to_raw "$file"
        echo "[CHANGED] $file | resized to long edge 960 and converted to $out_jpg"
      else
        rm -f "$tmp_out"
        echo "[SKIP] $file | conversion failed"
      fi
    else
      if sips --setProperty format jpeg "$file" --out "$tmp_out" >/dev/null 2>&1; then
        mv "$tmp_out" "$out_jpg"
        move_to_raw "$file"
        echo "[CHANGED] $file | converted to $out_jpg (size unchanged)"
      else
        rm -f "$tmp_out"
        echo "[SKIP] $file | conversion failed"
      fi
    fi

    continue
  fi

  if (( long_edge > 960 )); then
    tmp_out="${file}.tmp.$$"
    if sips --resampleHeightWidthMax 960 "$file" --out "$tmp_out" >/dev/null 2>&1; then
      move_to_raw "$file"
      mv "$tmp_out" "$file"
      echo "[CHANGED] $file | resized to long edge 960"
    else
      rm -f "$tmp_out"
      echo "[SKIP] $file | resize failed"
    fi
  else
    echo "[UNCHANGED] $file | long edge ${long_edge}px <= 960"
  fi
done

echo "Done."
