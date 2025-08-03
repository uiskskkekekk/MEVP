#! /usr/bin/python

"""
Use location vs. haplotype raw data 
to reduce haplotype size to N (e.g., N ~ 30)
Output all haplotypes using index
"""

import sys
import pandas as pd

if len(sys.argv) != 6:
    print("Usage: python reduce_hap_size_py3.py <hap_info_file> <hap_fasta_file> <reduce_size> <csv_file>")
    sys.exit(1)

infile_name = sys.argv[1]       # Zpl.dup.list
# >uniq_17_4      f_287241_ZpDL_Dapo_R1f,f_458536_ZpDL_XkB_R1f,f_756313_ZpDL_Dapo_R1f,f_1304152_ZpDL_Dapo_R2f

fasta_file_name = sys.argv[2]   # Zpl.dup.tab  // Zp-ASVs.msa.tab, aligned file
# uniq_17_4       atattatgtataatatcacataatgcattaataccatatatgtattatcaccattcatttattttaaccccaaagcaagtactaaaatt

reduce_size = int(sys.argv[3])  # target number of reduced haplotypes, e.g., 30

excel_file =  sys.argv[4]          # eDNA樣站.xlsx

output_file = sys.argv[5]       # ___.reduce.fa

# ---------- Extract unique location names from "eDNA樣站(2).xlsx" ----------
excel_file = 'eDNA樣站(2).xlsx'  # 記得路徑要正確
df = pd.read_excel(excel_file)

# 確保欄位名稱正確（可能有前後空白）
df.columns = df.columns.str.strip()

if 'eDNA_ID' not in df.columns:
    print("❌ 找不到 'eDNA_ID' 欄位，請確認 Excel 檔案格式")
    sys.exit(1)

locations = sorted(df['eDNA_ID'].dropna().astype(str).str.strip().unique().tolist())
print("✅ Found %d unique locations from Excel (eDNA_ID): %s" % (len(locations), locations))


# ---------- Parse hap info list file ----------
# Parse haplotype distribution from sample data
haplotypes = []  # list of all haplotype indices
hap_location_counts = {}  # count of each location + haplotype index pair

with open(infile_name, 'r') as infile:
    for line in infile:
        line = line.strip()
        if not line or '\t' not in line:
            continue
        hap_id, read_ids = line.split('\t')  # e.g., uniq_17_4 \t f_287241_ZpDL_Dapo_R1f,...
        hap_index = hap_id.split('_')[1]     # get haplotype index (e.g., 17)

        if hap_index not in haplotypes:
            haplotypes.append(hap_index)

        for read_id in read_ids.split(','):
            parts = read_id.split('_')
            if len(parts) >= 4:
                location = parts[3]  # extract location (e.g., Dapo)
                key = "%s_%s" % (location, hap_index)  # create key: location_index
                hap_location_counts[key] = hap_location_counts.get(key, 0) + 1

print("✅ Loaded %d haplotypes" % len(haplotypes))

# ---------- Read fasta file ----------
# Map each hap_index to its sequence
hap_seqs = {}
with open(fasta_file_name, 'r') as f:
    current_id = None
    seq_lines = []
    for line in f:
        line = line.strip()
        if line.startswith(">"):
            if current_id:
                hap_index = current_id.split('_')[1]
                hap_seqs[hap_index] = ''.join(seq_lines)
            current_id = line[1:]
            seq_lines = []
        else:
            seq_lines.append(line)
    if current_id:
        hap_index = current_id.split('_')[1]
        hap_seqs[hap_index] = ''.join(seq_lines)

print("✅ Loaded %d FASTA sequences" % len(hap_seqs))

# ---------- Generate output ----------
# Reduce haplotypes per location proportionally and write to output FASTA

output_entries = []

for loc in locations:
    total = 0  # total number of reads for this location
    reduce_dt = {}  # number of reads to keep for each hap_index
    arry_hap_num = []     # list of counts
    arry_hap_index = []   # list of hap_indices

    # count total reads at this location
    for hap_index in haplotypes:
        key = "%s_%s" % (loc, hap_index)
        count = hap_location_counts.get(key, 0)
        total += count

    # calculate number of reads to retain per hap_index proportionally
    for hap_index in haplotypes:
        key = "%s_%s" % (loc, hap_index)
        count = hap_location_counts.get(key, 0)
        if count > 0 and total > 0:
            reduce_count = int((float(count) / total) * reduce_size)
            if reduce_count > 0:
                reduce_dt[key] = reduce_count
                arry_hap_num.append(reduce_count)
                arry_hap_index.append(hap_index)

    # keep top N hap_indices with most reads until total reaches reduce_size
    keep_hap_index = []
    keep_hap_num = []
    final_reduce_size = 0

    while arry_hap_num and final_reduce_size < reduce_size:
        max_val = max(arry_hap_num)
        idx = arry_hap_num.index(max_val)
        hap_index = arry_hap_index[idx]

        final_reduce_size += max_val
        keep_hap_index.append(hap_index)
        keep_hap_num.append(max_val)

        del arry_hap_num[idx]
        del arry_hap_index[idx]

    # collect output entries with loc, hap_index, i
    for hap_index in keep_hap_index:
        key = "%s_%s" % (loc, hap_index)
        num = reduce_dt.get(key, 0)
        if hap_index in hap_seqs:
            for i in range(num):
                output_entries.append((loc, int(hap_index), i, hap_seqs[hap_index]))  # sort by loc, int(hap_index), i

# sort output entries: loc (alpha), hap_index (numeric), i (numeric)
output_entries.sort()

output_count = 0
with open(output_file, 'w') as out:
    for loc, hap_index, i, seq in output_entries:
        out.write(">%s_%d_%d\n%s\n" % (loc, hap_index, i, seq))
        output_count += 1

print("🎉 Done! Output %d representative haplotypes to %s" % (output_count, output_file)    )


