//go:build !windows

package service

import "syscall"

func getDiskUsage(path string) (diskUsage, error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return diskUsage{}, err
	}

	total := int64(stat.Blocks) * int64(stat.Bsize)
	free := int64(stat.Bavail) * int64(stat.Bsize)
	used := total - free
	return diskUsage{
		Total: total,
		Free:  free,
		Used:  used,
		Ok:    true,
	}, nil
}
