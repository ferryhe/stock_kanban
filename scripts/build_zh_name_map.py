import argparse
import json
from pathlib import Path

import akshare as ak

CODE_ZH = "\u4ee3\u7801"  # 代码
NAME_ZH = "\u540d\u79f0"  # 名称
NAME_ZH_CN = "\u4e2d\u6587\u540d\u79f0"  # 中文名称
NAME_ZH_CN_SHORT = "\u4e2d\u6587\u540d"  # 中文名


def load_existing(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_map(path: Path, data: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def pick_column(columns: list[str], candidates: list[str]) -> str | None:
    for name in candidates:
        if name in columns:
            return name
    return None


def add_a_share(mapping: dict[str, str], target_symbols: set[str] | None) -> tuple[int, int]:
    df = ak.stock_info_a_code_name()
    code_col = pick_column(df.columns.tolist(), ["code", CODE_ZH])
    name_col = pick_column(df.columns.tolist(), ["name", NAME_ZH])
    if not code_col or not name_col:
        raise RuntimeError("A-share columns not found.")

    added = 0
    skipped = 0
    for _, row in df.iterrows():
        code = str(row[code_col]).strip()
        name = str(row[name_col]).strip()
        if not code or not name or code == "nan" or name == "nan":
            skipped += 1
            continue
        if code.startswith("6"):
            symbol = f"{code}.SS"
        elif code.startswith(("0", "3")):
            symbol = f"{code}.SZ"
        else:
            skipped += 1
            continue
        if target_symbols is not None and symbol not in target_symbols:
            skipped += 1
            continue
        if mapping.get(symbol) != name:
            mapping[symbol] = name
            added += 1
    return added, skipped


def add_hk_share(mapping: dict[str, str], target_symbols: set[str] | None) -> tuple[int, int]:
    df = ak.stock_hk_spot()
    code_col = pick_column(df.columns.tolist(), [CODE_ZH, "symbol", "code"])
    name_col = pick_column(df.columns.tolist(), [NAME_ZH, NAME_ZH_CN, "cname"])
    if not code_col or not name_col:
        raise RuntimeError("HK columns not found.")

    added = 0
    skipped = 0
    for _, row in df.iterrows():
        code = str(row[code_col]).strip()
        name = str(row[name_col]).strip()
        if not code or not name or code == "nan" or name == "nan":
            skipped += 1
            continue
        code = code.zfill(5) if code.isdigit() else code
        symbol = f"{code}.HK" if not code.upper().endswith(".HK") else code.upper()
        if target_symbols is not None and symbol not in target_symbols:
            skipped += 1
            continue
        if mapping.get(symbol) != name:
            mapping[symbol] = name
            added += 1
    return added, skipped


def add_us_spot_cname(mapping: dict[str, str], target_symbols: set[str] | None) -> tuple[int, int]:
    df = ak.stock_us_spot()
    symbol_col = pick_column(df.columns.tolist(), ["symbol", CODE_ZH])
    cname_col = pick_column(df.columns.tolist(), ["cname", NAME_ZH_CN, NAME_ZH_CN_SHORT])
    if not symbol_col or not cname_col:
        raise RuntimeError("US spot cname columns not found.")

    added = 0
    skipped = 0
    for _, row in df.iterrows():
        code = str(row[symbol_col]).strip().upper()
        name = str(row[cname_col]).strip()
        if not code or not name or code == "nan" or name == "nan":
            skipped += 1
            continue
        if target_symbols is not None and code not in target_symbols:
            skipped += 1
            continue
        if mapping.get(code) != name:
            mapping[code] = name
            added += 1
    return added, skipped


def main() -> int:
    parser = argparse.ArgumentParser(description="Build zh name map using AKShare.")
    parser.add_argument("--out", default="data/zh-name-map-all.json")
    parser.add_argument("--include-a", action="store_true")
    parser.add_argument("--include-hk", action="store_true")
    parser.add_argument("--include-us-cname", action="store_true")
    parser.add_argument("--symbols", default="")
    parser.add_argument("--symbols-file", default="")
    args = parser.parse_args()

    out_path = Path(args.out)
    mapping = load_existing(out_path)
    total_added = 0
    target_symbols: set[str] | None = None
    if args.symbols or args.symbols_file:
        target_symbols = set()
        if args.symbols:
            target_symbols.update(
                {s.strip().upper() for s in args.symbols.split(",") if s.strip()}
            )
        if args.symbols_file:
            try:
                raw = Path(args.symbols_file).read_text(encoding="utf-8")
                for line in raw.splitlines():
                    if line.strip():
                        target_symbols.add(line.strip().upper())
            except Exception:
                pass

    if args.include_a:
        added, skipped = add_a_share(mapping, target_symbols)
        print(f"A-share: added={added}, skipped={skipped}")
        total_added += added

    if args.include_hk:
        try:
            added, skipped = add_hk_share(mapping, target_symbols)
            print(f"HK: added={added}, skipped={skipped}")
            total_added += added
        except Exception as exc:
            print(f"HK: failed ({exc})")

    if args.include_us_cname:
        try:
            added, skipped = add_us_spot_cname(mapping, target_symbols)
            print(f"US cname: added={added}, skipped={skipped}")
            total_added += added
        except Exception as exc:
            print(f"US cname: failed ({exc})")

    save_map(out_path, mapping)
    print(f"Saved {len(mapping)} entries to {out_path} (added {total_added}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
