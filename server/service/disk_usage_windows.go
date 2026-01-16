//go:build windows

package service

import "golang.org/x/sys/windows"

func getDiskUsage(path string) (diskUsage, error) {
	if path == "" {
		return diskUsage{}, windows.ERROR_PATH_NOT_FOUND
	}

	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return diskUsage{}, err
	}

	var freeAvailable uint64
	var total uint64
	var totalFree uint64
	if err := windows.GetDiskFreeSpaceEx(pathPtr, &freeAvailable, &total, &totalFree); err != nil {
		return diskUsage{}, err
	}

	used := int64(total - freeAvailable)
	return diskUsage{
		Total: int64(total),
		Free:  int64(freeAvailable),
		Used:  used,
		Ok:    true,
	}, nil
}
