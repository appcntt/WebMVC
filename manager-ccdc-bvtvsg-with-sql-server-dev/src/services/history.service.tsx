/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "./api";

interface HistoryParams {
    toolId?: string;
    employeeId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

interface StatsParams {
    startDate?: string;
    endDate?: string;
}

interface UpgradeHistoryParams {
    toolId?: string;
    subToolId?: string;
    accessoryId?: string;
}

interface CreateHistoryData {
    tool: string;
    subTool?: string;
    accessory?: string;
    employee?: string;
    previousEmployee?: string;
    action: string;
    upgradeInfo?: any;
    condition?: string;
    conditionBefore?: string;
    conditionAfter?: string;
    notes?: string;
    attachments?: any[];
    description?: string;
}

interface UpdateHistoryData {
    condition?: string;
    conditionBefore?: string;
    conditionAfter?: string;
    notes?: string;
    description?: string;
}

export const toolHistoryService = {
    /**
     * Lấy tất cả lịch sử với các tham số filter
     * @param params - toolId, employeeId, action, startDate, endDate, page, limit
     */
    getAll: async (params: HistoryParams = {}) => {
        try {
            const res = await api.get('/historys', { params });
            return res.data;
        } catch (error) {
            console.error("Lấy lịch sử thất bại:", error);
            throw error;
        }
    },

    /**
     * Lấy lịch sử theo ID
     */
    getById: async (id: string) => {
        const res = await api.get(`/historys/${id}`);
        return res.data;
    },

    /**
     * Lấy lịch sử theo công cụ (Tool)
     */
    getByTool: async (toolId: string) => {
        const res = await api.get(`/tool-history/tool/${toolId}`);
        return res.data;
    },

    /**
     * Lấy lịch sử theo nhân viên
     */
    getByEmployee: async (employeeId: string) => {
        const res = await api.get(`/historys/employee/${employeeId}`);
        return res.data;
    },

    /**
     * Lấy lịch sử theo thiết bị con (SubTool)
     */
    getBySubTool: async (subToolId: string) => {
        const response = await api.get(`/tool-history/subtool/${subToolId}`);
        return response.data;
    },

    /**
     * Lấy lịch sử theo linh kiện (Accessory)
     */
    getByAccessory: async (accessoryId: string) => {
        const response = await api.get(`/historys/accessory/${accessoryId}`);
        return response.data;
    },

    /**
     * Lấy lịch sử nâng cấp
     * @param params - toolId, subToolId, accessoryId
     */
    getUpgradeHistory: async (params: UpgradeHistoryParams = {}) => {
        const response = await api.get('/historys/upgrade-history', { params });
        return response.data;
    },

    /**
     * Lấy timeline của một công cụ
     */
    getTimeline: async (toolId: string) => {
        const response = await api.get(`/historys/timeline/${toolId}`);
        return response.data;
    },

    /**
     * Lấy thống kê lịch sử
     * @param params - startDate, endDate
     */
    getStats: async (params: StatsParams = {}) => {
        const res = await api.get('/historys/stats', { params });
        return res.data;
    },

    /**
     * Tạo lịch sử mới
     */
    create: async (data: CreateHistoryData) => {
        const res = await api.post('/historys', data);
        return res.data;
    },

    /**
     * Cập nhật lịch sử
     */
    update: async (id: string, data: UpdateHistoryData) => {
        const res = await api.put(`/historys/${id}`, data);
        return res.data;
    },

    /**
     * Xóa lịch sử (cần quyền manage_system)
     */
    delete: async (id: string) => {
        const res = await api.delete(`/historys/${id}`);
        return res.data;
    }
};

export default toolHistoryService;