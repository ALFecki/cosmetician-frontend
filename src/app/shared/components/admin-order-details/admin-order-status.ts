export const adminOrderStatuses = [
    { value: 'Checked', label: 'Подтверждён' },
    { value: 'Processing', label: 'В обработке' },
    { value: 'InDelivery', label: 'В доставке' },
    { value: 'Delivered', label: 'Доставлен' },
    { value: 'Completed', label: 'Завершён' },
    { value: 'Cancelled', label: 'Отменён' },
];

export function adminOrderStatusLabel(status: string): string {
    return (
        adminOrderStatuses.find(option => option.value.toLowerCase() === status.toLowerCase())?.label ??
        (status === 'NotChecked' ? 'Не оформлен' : status)
    );
}
