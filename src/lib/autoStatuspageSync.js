
// lib/autoStatuspageSync.js
import axios from 'axios';

class AutoStatuspageSync {
    constructor() {
        this.apiKey = process.env.STATUSPAGE_API_KEY;
        this.pageId = process.env.STATUSPAGE_PAGE_ID;
        this.baseUrl = 'https://api.statuspage.io/v1';
        this.componentCache = new Map();
    }

    async autoDiscoverAndSync(healthReport) {
        try {
            if (!this.apiKey || !this.pageId) {
                console.log('⚠️  Statuspage not configured, skipping sync');
                return { success: false, message: 'Statuspage not configured' };
            }

            const existingComponents = await this.getExistingComponents();
            const groupedApis = this.groupApisByCategory(healthReport.apis);
            const syncResults = [];

            // Sync each category
            for (const [category, apis] of Object.entries(groupedApis)) {
                let component = this.findComponentByName(existingComponents, category);

                if (!component) {
                    component = await this.createComponent({
                        name: category,
                        description: `${apis.length} APIs in this module`,
                    });
                }

                const categoryHealth = this.calculateCategoryHealth(apis);

                await this.updateComponentStatus(
                    component.id,
                    categoryHealth.status,
                    categoryHealth.description
                );

                syncResults.push({
                    category,
                    componentId: component.id,
                    status: categoryHealth.status,
                    apiCount: apis.length,
                });
            }

            // Sync database
            if (healthReport.database) {
                let dbComponent = this.findComponentByName(existingComponents, 'Database');
                if (!dbComponent) {
                    dbComponent = await this.createComponent({
                        name: 'Database',
                        description: 'PostgreSQL Database Connection',
                    });
                }
                await this.updateComponentStatus(
                    dbComponent.id,
                    healthReport.database.status,
                    healthReport.database.message
                );
            }

            // Create incident if services are down
            if (healthReport.summary.downCount > 0) {
                await this.autoCreateIncident(healthReport, syncResults);
            }

            return {
                success: true,
                syncResults,
                summary: {
                    totalCategories: Object.keys(groupedApis).length,
                    componentsUpdated: syncResults.length,
                }
            };

        } catch (error) {
            console.error('❌ Statuspage sync failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    groupApisByCategory(apis) {
        const groups = {};
        for (const api of apis) {
            const category = this.extractCategory(api.endpoint);
            if (!groups[category]) groups[category] = [];
            groups[category].push(api);
        }
        return groups;
    }

    extractCategory(endpoint) {
        const cleanPath = endpoint.replace(/^\/api\//, '');
        const segments = cleanPath.split('/').filter(Boolean);

        if (segments.length === 0) return 'Core API';

        const categoryMap = {
            'auth': 'Authentication',
            'users': 'User Management',
            'students': 'Student Management',
            'teachers': 'Teacher Management',
            'staff': 'Staff Management',
            'fees': 'Fee Management',
            'attendance': 'Attendance System',
            'exams': 'Examination System',
            'library': 'Library System',
            'transport': 'Transport System',
            'inventory': 'Inventory Management',
            'notices': 'Notice Board',
            'assignments': 'Assignments',
            'timetable': 'Timetable',
            'certificates': 'Certificates',
            'admissions': 'Admissions',
            'parents': 'Parent Portal',
            'calendar': 'Calendar & Events',
        };

        const firstSegment = segments[0].toLowerCase();
        return categoryMap[firstSegment] || this.capitalize(firstSegment) + ' API';
    }

    calculateCategoryHealth(apis) {
        const totalApis = apis.length;
        const healthyApis = apis.filter(api => api.status === 'healthy').length;
        const degradedApis = apis.filter(api => api.status === 'degraded' || api.status === 'warning').length;
        const downApis = apis.filter(api => api.status === 'down').length;

        let status = 'healthy';
        let description = `${healthyApis}/${totalApis} endpoints operational`;

        if (downApis > 0) {
            status = 'down';
            description = `${downApis} endpoints down`;
        } else if (degradedApis > totalApis * 0.3) {
            status = 'degraded';
            description = `${degradedApis} endpoints degraded`;
        } else if (degradedApis > 0) {
            status = 'warning';
            description = `${degradedApis} endpoints showing issues`;
        }

        const avgResponseTime = apis.reduce((sum, api) => sum + api.avgResponseTime, 0) / totalApis;
        description += ` (avg ${Math.round(avgResponseTime)}ms)`;

        return { status, description };
    }

    async getExistingComponents() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/pages/${this.pageId}/components`,
                { headers: { 'Authorization': `OAuth ${this.apiKey}` } }
            );
            return response.data || [];
        } catch (error) {
            return [];
        }
    }

    async createComponent(data) {
        const response = await axios.post(
            `${this.baseUrl}/pages/${this.pageId}/components`,
            {
                component: {
                    name: data.name,
                    description: data.description,
                    status: 'operational',
                    showcase: true,
                }
            },
            { headers: { 'Authorization': `OAuth ${this.apiKey}`, 'Content-Type': 'application/json' } }
        );
        return response.data;
    }

    async updateComponentStatus(componentId, status, description = null) {
        const statuspageStatus = this.mapHealthToStatuspage(status);
        await axios.patch(
            `${this.baseUrl}/pages/${this.pageId}/components/${componentId}`,
            { component: { status: statuspageStatus, description } },
            { headers: { 'Authorization': `OAuth ${this.apiKey}`, 'Content-Type': 'application/json' } }
        );
    }

    async autoCreateIncident(healthReport, syncResults) {
        const downComponents = syncResults.filter(r => r.status === 'down');
        if (downComponents.length === 0) return;

        const affectedCategories = downComponents.map(c => c.category).join(', ');
        await axios.post(
            `${this.baseUrl}/pages/${this.pageId}/incidents`,
            {
                incident: {
                    name: `Service Disruption: ${affectedCategories}`,
                    status: 'investigating',
                    impact_override: downComponents.length > 3 ? 'critical' : 'major',
                    body: `We are experiencing issues with: ${affectedCategories}. Our team is investigating.`,
                    component_ids: downComponents.map(c => c.componentId),
                }
            },
            { headers: { 'Authorization': `OAuth ${this.apiKey}`, 'Content-Type': 'application/json' } }
        );
    }

    findComponentByName(components, name) {
        return components.find(c => c.name.toLowerCase() === name.toLowerCase());
    }

    mapHealthToStatuspage(healthStatus) {
        const statusMap = {
            'healthy': 'operational',
            'warning': 'degraded_performance',
            'degraded': 'degraded_performance',
            'down': 'major_outage',
        };
        return statusMap[healthStatus] || 'operational';
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

export const autoStatuspage = new AutoStatuspageSync();
