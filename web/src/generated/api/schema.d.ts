export interface paths {
    "/api/v1/academic/periods": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. فقط Manager سازمان جاری. فهرست اعضا شامل حساب/شخص/عضویت/نقش‌های مستقل است؛ profilePhoto فقط طبق سیاست فعلی Avatar و در غیر این صورت null. کاتالوگ‌ها شامل موارد استفاده‌نشده هم هستند. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        get: {
            parameters: {
                query?: {
                    /** @description جست‌وجوی trimشده تا ۱۰۰ نویسه؛ فقط در محدودهٔ مجاز */
                    Search?: string;
                    /**
                     * @description صفحه از ۱؛ حداکثر 100000
                     * @example 1
                     */
                    Page?: number;
                    /**
                     * @description ۱ تا ۱۰۰؛ پیش‌فرض ۵۰
                     * @example 50
                     */
                    PageSize?: number;
                    status?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolPageOfAcademicPeriodResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "id": "00000000-0000-0000-0000-000000000001",
                         *           "organizationId": "00000000-0000-0000-0000-000000000002",
                         *           "title": "دوره",
                         *           "startDate": "2026-09-01",
                         *           "endDate": "2027-06-30",
                         *           "status": "Active"
                         *         }
                         *       ]
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolPageOfAcademicPeriodResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "id": "00000000-0000-0000-0000-000000000001",
                         *           "organizationId": "00000000-0000-0000-0000-000000000002",
                         *           "title": "دوره",
                         *           "startDate": "2026-09-01",
                         *           "endDate": "2027-06-30",
                         *           "status": "Active"
                         *         }
                         *       ]
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolPageOfAcademicPeriodResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateAcademicPeriodCommand"];
                    "text/json": components["schemas"]["CreateAcademicPeriodCommand"];
                    "application/*+json": components["schemas"]["CreateAcademicPeriodCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AcademicPeriodResult"];
                        "application/json": components["schemas"]["AcademicPeriodResult"];
                        "text/json": components["schemas"]["AcademicPeriodResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ai/teachers/classes/{classId}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AiRoleInsightResponse"];
                        "application/json": components["schemas"]["AiRoleInsightResponse"];
                        "text/json": components["schemas"]["AiRoleInsightResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AssignmentResult"][];
                        "application/json": components["schemas"]["AssignmentResult"][];
                        "text/json": components["schemas"]["AssignmentResult"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateAssignmentDraftCommand"];
                    "text/json": components["schemas"]["CreateAssignmentDraftCommand"];
                    "application/*+json": components["schemas"]["CreateAssignmentDraftCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AssignmentResult"];
                        "application/json": components["schemas"]["AssignmentResult"];
                        "text/json": components["schemas"]["AssignmentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    classId?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AssignmentResult"][];
                        "application/json": components["schemas"]["AssignmentResult"][];
                        "text/json": components["schemas"]["AssignmentResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/assignments/{assignmentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AssignmentResult"];
                        "application/json": components["schemas"]["AssignmentResult"];
                        "text/json": components["schemas"]["AssignmentResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateAssignmentDraftCommand"];
                    "text/json": components["schemas"]["UpdateAssignmentDraftCommand"];
                    "application/*+json": components["schemas"]["UpdateAssignmentDraftCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AssignmentResult"];
                        "application/json": components["schemas"]["AssignmentResult"];
                        "text/json": components["schemas"]["AssignmentResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/assignments/{assignmentId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["PublishAssignmentCommand"];
                    "text/json": components["schemas"]["PublishAssignmentCommand"];
                    "application/*+json": components["schemas"]["PublishAssignmentCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PublishAssignmentResult"];
                        "application/json": components["schemas"]["PublishAssignmentResult"];
                        "text/json": components["schemas"]["PublishAssignmentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/otp/challenges": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["RequestOtpCommand"];
                    "text/json": components["schemas"]["RequestOtpCommand"];
                    "application/*+json": components["schemas"]["RequestOtpCommand"];
                };
            };
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["RequestOtpResult"];
                        "application/json": components["schemas"]["RequestOtpResult"];
                        "text/json": components["schemas"]["RequestOtpResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/otp/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VerifyOtpCommand"];
                    "text/json": components["schemas"]["VerifyOtpCommand"];
                    "application/*+json": components["schemas"]["VerifyOtpCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["VerifyOtpResult"];
                        "application/json": components["schemas"]["VerifyOtpResult"];
                        "text/json": components["schemas"]["VerifyOtpResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["RefreshSessionCommand"];
                    "text/json": components["schemas"]["RefreshSessionCommand"];
                    "application/*+json": components["schemas"]["RefreshSessionCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["RefreshSessionResult"];
                        "application/json": components["schemas"]["RefreshSessionResult"];
                        "text/json": components["schemas"]["RefreshSessionResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["UserSessionResult"][];
                        "application/json": components["schemas"]["UserSessionResult"][];
                        "text/json": components["schemas"]["UserSessionResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions/{sessionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions/revoke-others": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/learners": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. فقط Manager یا Teacher با Assignment فعال همان کلاس. این endpoint فهرست مدیریتی است؛ Student و Parent به roster کامل دسترسی ندارند و 404 برای پنهان‌سازی منبع دریافت می‌کنند. شناسهٔ رابطه از User/Person/Membership جداست؛ وضعیت پیش‌فرض Active. مرجع یا مجوز نامعتبر 404. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        get: {
            parameters: {
                query?: {
                    /** @description جست‌وجوی trimشده تا ۱۰۰ نویسه؛ فقط در محدودهٔ مجاز */
                    Search?: string;
                    /**
                     * @description صفحه از ۱؛ حداکثر 100000
                     * @example 1
                     */
                    Page?: number;
                    /**
                     * @description ۱ تا ۱۰۰؛ پیش‌فرض ۵۰
                     * @example 50
                     */
                    PageSize?: number;
                    status?: string;
                };
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolPageOfClassLearnerResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "enrollmentId": "00000000-0000-0000-0000-000000000001",
                         *           "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000002",
                         *           "personId": "00000000-0000-0000-0000-000000000003",
                         *           "userId": null,
                         *           "displayName": "فراگیر",
                         *           "username": null,
                         *           "profilePhoto": null,
                         *           "status": "Active",
                         *           "enrolledAtUtc": "2026-10-28T12:00:00Z",
                         *           "endedAtUtc": null,
                         *           "version": "AAAAAAAAAAE="
                         *         }
                         *       ]
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolPageOfClassLearnerResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "enrollmentId": "00000000-0000-0000-0000-000000000001",
                         *           "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000002",
                         *           "personId": "00000000-0000-0000-0000-000000000003",
                         *           "userId": null,
                         *           "displayName": "فراگیر",
                         *           "username": null,
                         *           "profilePhoto": null,
                         *           "status": "Active",
                         *           "enrolledAtUtc": "2026-10-28T12:00:00Z",
                         *           "endedAtUtc": null,
                         *           "version": "AAAAAAAAAAE="
                         *         }
                         *       ]
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolPageOfClassLearnerResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "CLASS_NOT_FOUND",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/teachers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. فقط Manager یا Teacher با Assignment فعال همان کلاس. این endpoint فهرست مدیریتی است؛ Student و Parent به roster کامل دسترسی ندارند و 404 برای پنهان‌سازی منبع دریافت می‌کنند. شناسهٔ رابطه از User/Person/Membership جداست؛ وضعیت پیش‌فرض Active. مرجع یا مجوز نامعتبر 404. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        get: {
            parameters: {
                query?: {
                    /** @description جست‌وجوی trimشده تا ۱۰۰ نویسه؛ فقط در محدودهٔ مجاز */
                    Search?: string;
                    /**
                     * @description صفحه از ۱؛ حداکثر 100000
                     * @example 1
                     */
                    Page?: number;
                    /**
                     * @description ۱ تا ۱۰۰؛ پیش‌فرض ۵۰
                     * @example 50
                     */
                    PageSize?: number;
                    status?: string;
                };
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolPageOfClassTeacherResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "teacherAssignmentId": "00000000-0000-0000-0000-000000000001",
                         *           "teacherMembershipId": "00000000-0000-0000-0000-000000000002",
                         *           "userId": "00000000-0000-0000-0000-000000000003",
                         *           "personId": null,
                         *           "displayName": "مدرس",
                         *           "username": null,
                         *           "profilePhoto": null,
                         *           "status": "Active",
                         *           "assignedAtUtc": "2026-10-28T12:00:00Z",
                         *           "endedAtUtc": null,
                         *           "version": "AAAAAAAAAAE="
                         *         }
                         *       ]
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolPageOfClassTeacherResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "teacherAssignmentId": "00000000-0000-0000-0000-000000000001",
                         *           "teacherMembershipId": "00000000-0000-0000-0000-000000000002",
                         *           "userId": "00000000-0000-0000-0000-000000000003",
                         *           "personId": null,
                         *           "displayName": "مدرس",
                         *           "username": null,
                         *           "profilePhoto": null,
                         *           "status": "Active",
                         *           "assignedAtUtc": "2026-10-28T12:00:00Z",
                         *           "endedAtUtc": null,
                         *           "version": "AAAAAAAAAAE="
                         *         }
                         *       ]
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolPageOfClassTeacherResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "CLASS_NOT_FOUND",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AssignTeacherCommand"];
                    "text/json": components["schemas"]["AssignTeacherCommand"];
                    "application/*+json": components["schemas"]["AssignTeacherCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["TeacherAssignmentResult"];
                        "application/json": components["schemas"]["TeacherAssignmentResult"];
                        "text/json": components["schemas"]["TeacherAssignmentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ClassResult"][];
                        "application/json": components["schemas"]["ClassResult"][];
                        "text/json": components["schemas"]["ClassResult"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateClassCommand"];
                    "text/json": components["schemas"]["CreateClassCommand"];
                    "application/*+json": components["schemas"]["CreateClassCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ClassResult"];
                        "application/json": components["schemas"]["ClassResult"];
                        "text/json": components["schemas"]["ClassResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/enrollments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["EnrollLearnerCommand"];
                    "text/json": components["schemas"]["EnrollLearnerCommand"];
                    "application/*+json": components["schemas"]["EnrollLearnerCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["EnrollmentResult"];
                        "application/json": components["schemas"]["EnrollmentResult"];
                        "text/json": components["schemas"]["EnrollmentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/enrollments/{enrollmentId}/end": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                    enrollmentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["EndEnrollmentCommand"];
                    "text/json": components["schemas"]["EndEnrollmentCommand"];
                    "application/*+json": components["schemas"]["EndEnrollmentCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["EnrollmentResult"];
                        "application/json": components["schemas"]["EnrollmentResult"];
                        "text/json": components["schemas"]["EnrollmentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/teachers/{teacherAssignmentId}/end": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                    teacherAssignmentId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["TeacherAssignmentResult"];
                        "application/json": components["schemas"]["TeacherAssignmentResult"];
                        "text/json": components["schemas"]["TeacherAssignmentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/lessons": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. Manager یا Teacher با Assignment فعال همان کلاس مجاز به نوشتن و دیدن Draft است. Student با Enrollment فعال فقط Published را می‌بیند. Parent مجاز نیست (OPEN_PRODUCT_DECISION). محتوا plain text و انتشار در این مرحله immutable است. version/expectedVersion برابر Base64 rowversion هشت‌بایتی است. Create با clientOperationId بازپخش‌پذیر؛ تغییر payload همان عملیات 409؛ نسخهٔ کهنه 412. پیوست جدید باید FileAsset آمادهٔ همان سازمان و متعلق به فرستنده باشد (حداکثر ۱۰). DownloadUrl نسبی است و در هر درخواست مجوز جاری بررسی می‌شود. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        get: {
            parameters: {
                query?: {
                    /** @description جست‌وجوی trimشده تا ۱۰۰ نویسه؛ فقط در محدودهٔ مجاز */
                    Search?: string;
                    /**
                     * @description صفحه از ۱؛ حداکثر 100000
                     * @example 1
                     */
                    Page?: number;
                    /**
                     * @description ۱ تا ۱۰۰؛ پیش‌فرض ۵۰
                     * @example 50
                     */
                    PageSize?: number;
                };
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolPageOfClassLessonResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "id": "00000000-0000-0000-0000-000000000001",
                         *           "organizationId": "00000000-0000-0000-0000-000000000002",
                         *           "classId": "00000000-0000-0000-0000-000000000003",
                         *           "courseId": "00000000-0000-0000-0000-000000000004",
                         *           "title": "درس اول",
                         *           "body": "متن درس",
                         *           "displayOrder": 0,
                         *           "status": "Draft",
                         *           "revisionNumber": 1,
                         *           "version": "AAAAAAAAAAE=",
                         *           "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *           "createdAtUtc": "2026-10-28T12:00:00Z",
                         *           "updatedAtUtc": null,
                         *           "publishedAtUtc": null,
                         *           "attachments": [],
                         *           "replayed": false
                         *         }
                         *       ]
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolPageOfClassLessonResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "id": "00000000-0000-0000-0000-000000000001",
                         *           "organizationId": "00000000-0000-0000-0000-000000000002",
                         *           "classId": "00000000-0000-0000-0000-000000000003",
                         *           "courseId": "00000000-0000-0000-0000-000000000004",
                         *           "title": "درس اول",
                         *           "body": "متن درس",
                         *           "displayOrder": 0,
                         *           "status": "Draft",
                         *           "revisionNumber": 1,
                         *           "version": "AAAAAAAAAAE=",
                         *           "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *           "createdAtUtc": "2026-10-28T12:00:00Z",
                         *           "updatedAtUtc": null,
                         *           "publishedAtUtc": null,
                         *           "attachments": [],
                         *           "replayed": false
                         *         }
                         *       ]
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolPageOfClassLessonResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "LESSON_NOT_FOUND",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 409,
                         *       "code": "LESSON_STATE_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                412: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 412,
                         *       "code": "LESSON_VERSION_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. Manager یا Teacher با Assignment فعال همان کلاس مجاز به نوشتن و دیدن Draft است. Student با Enrollment فعال فقط Published را می‌بیند. Parent مجاز نیست (OPEN_PRODUCT_DECISION). محتوا plain text و انتشار در این مرحله immutable است. version/expectedVersion برابر Base64 rowversion هشت‌بایتی است. Create با clientOperationId بازپخش‌پذیر؛ تغییر payload همان عملیات 409؛ نسخهٔ کهنه 412. پیوست جدید باید FileAsset آمادهٔ همان سازمان و متعلق به فرستنده باشد (حداکثر ۱۰). DownloadUrl نسبی است و در هر درخواست مجوز جاری بررسی می‌شود. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "clientOperationId": "00000000-0000-0000-0000-000000000001",
                     *       "title": "درس اول",
                     *       "body": "متن درس",
                     *       "displayOrder": 0,
                     *       "fileAssetIds": []
                     *     }
                     */
                    "application/json": components["schemas"]["CreateClassLessonCommand"];
                    /**
                     * @example {
                     *       "clientOperationId": "00000000-0000-0000-0000-000000000001",
                     *       "title": "درس اول",
                     *       "body": "متن درس",
                     *       "displayOrder": 0,
                     *       "fileAssetIds": []
                     *     }
                     */
                    "text/json": components["schemas"]["CreateClassLessonCommand"];
                    /**
                     * @example {
                     *       "clientOperationId": "00000000-0000-0000-0000-000000000001",
                     *       "title": "درس اول",
                     *       "body": "متن درس",
                     *       "displayOrder": 0,
                     *       "fileAssetIds": []
                     *     }
                     */
                    "application/*+json": components["schemas"]["CreateClassLessonCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "application/json": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "text/json": components["schemas"]["ClassLessonResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "application/json": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "text/json": components["schemas"]["ClassLessonResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "LESSON_NOT_FOUND",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 409,
                         *       "code": "LESSON_STATE_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                412: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 412,
                         *       "code": "LESSON_VERSION_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/lessons/{lessonId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. Manager یا Teacher با Assignment فعال همان کلاس مجاز به نوشتن و دیدن Draft است. Student با Enrollment فعال فقط Published را می‌بیند. Parent مجاز نیست (OPEN_PRODUCT_DECISION). محتوا plain text و انتشار در این مرحله immutable است. version/expectedVersion برابر Base64 rowversion هشت‌بایتی است. Create با clientOperationId بازپخش‌پذیر؛ تغییر payload همان عملیات 409؛ نسخهٔ کهنه 412. پیوست جدید باید FileAsset آمادهٔ همان سازمان و متعلق به فرستنده باشد (حداکثر ۱۰). DownloadUrl نسبی است و در هر درخواست مجوز جاری بررسی می‌شود. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    lessonId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "application/json": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "text/json": components["schemas"]["ClassLessonResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "LESSON_NOT_FOUND",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 409,
                         *       "code": "LESSON_STATE_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                412: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 412,
                         *       "code": "LESSON_VERSION_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. Manager یا Teacher با Assignment فعال همان کلاس مجاز به نوشتن و دیدن Draft است. Student با Enrollment فعال فقط Published را می‌بیند. Parent مجاز نیست (OPEN_PRODUCT_DECISION). محتوا plain text و انتشار در این مرحله immutable است. version/expectedVersion برابر Base64 rowversion هشت‌بایتی است. Create با clientOperationId بازپخش‌پذیر؛ تغییر payload همان عملیات 409؛ نسخهٔ کهنه 412. پیوست جدید باید FileAsset آمادهٔ همان سازمان و متعلق به فرستنده باشد (حداکثر ۱۰). DownloadUrl نسبی است و در هر درخواست مجوز جاری بررسی می‌شود. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    lessonId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "title": "درس اول",
                     *       "body": "متن جایگزین کامل",
                     *       "displayOrder": 0,
                     *       "fileAssetIds": [],
                     *       "expectedVersion": "AAAAAAAAAAE="
                     *     }
                     */
                    "application/json": components["schemas"]["UpdateClassLessonCommand"];
                    /**
                     * @example {
                     *       "title": "درس اول",
                     *       "body": "متن جایگزین کامل",
                     *       "displayOrder": 0,
                     *       "fileAssetIds": [],
                     *       "expectedVersion": "AAAAAAAAAAE="
                     *     }
                     */
                    "text/json": components["schemas"]["UpdateClassLessonCommand"];
                    /**
                     * @example {
                     *       "title": "درس اول",
                     *       "body": "متن جایگزین کامل",
                     *       "displayOrder": 0,
                     *       "fileAssetIds": [],
                     *       "expectedVersion": "AAAAAAAAAAE="
                     *     }
                     */
                    "application/*+json": components["schemas"]["UpdateClassLessonCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "application/json": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "text/json": components["schemas"]["ClassLessonResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "LESSON_NOT_FOUND",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 409,
                         *       "code": "LESSON_STATE_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                412: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 412,
                         *       "code": "LESSON_VERSION_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/lessons/{lessonId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. Manager یا Teacher با Assignment فعال همان کلاس مجاز به نوشتن و دیدن Draft است. Student با Enrollment فعال فقط Published را می‌بیند. Parent مجاز نیست (OPEN_PRODUCT_DECISION). محتوا plain text و انتشار در این مرحله immutable است. version/expectedVersion برابر Base64 rowversion هشت‌بایتی است. Create با clientOperationId بازپخش‌پذیر؛ تغییر payload همان عملیات 409؛ نسخهٔ کهنه 412. پیوست جدید باید FileAsset آمادهٔ همان سازمان و متعلق به فرستنده باشد (حداکثر ۱۰). DownloadUrl نسبی است و در هر درخواست مجوز جاری بررسی می‌شود. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    lessonId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "expectedVersion": "AAAAAAAAAAE="
                     *     }
                     */
                    "application/json": components["schemas"]["PublishClassLessonCommand"];
                    /**
                     * @example {
                     *       "expectedVersion": "AAAAAAAAAAE="
                     *     }
                     */
                    "text/json": components["schemas"]["PublishClassLessonCommand"];
                    /**
                     * @example {
                     *       "expectedVersion": "AAAAAAAAAAE="
                     *     }
                     */
                    "application/*+json": components["schemas"]["PublishClassLessonCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "application/json": components["schemas"]["ClassLessonResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "classId": "00000000-0000-0000-0000-000000000003",
                         *       "courseId": "00000000-0000-0000-0000-000000000004",
                         *       "title": "درس اول",
                         *       "body": "متن درس",
                         *       "displayOrder": 0,
                         *       "status": "Draft",
                         *       "revisionNumber": 1,
                         *       "version": "AAAAAAAAAAE=",
                         *       "createdByUserId": "00000000-0000-0000-0000-000000000005",
                         *       "createdAtUtc": "2026-10-28T12:00:00Z",
                         *       "updatedAtUtc": null,
                         *       "publishedAtUtc": null,
                         *       "attachments": [],
                         *       "replayed": false
                         *     }
                         */
                        "text/json": components["schemas"]["ClassLessonResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "LESSON_NOT_FOUND",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 409,
                         *       "code": "LESSON_STATE_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                412: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 412,
                         *       "code": "LESSON_VERSION_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagerCommerceSummaryDto"];
                        "application/json": components["schemas"]["ManagerCommerceSummaryDto"];
                        "text/json": components["schemas"]["ManagerCommerceSummaryDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrderListResult"];
                        "application/json": components["schemas"]["OrderListResult"];
                        "text/json": components["schemas"]["OrderListResult"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateOrderCommand"];
                    "text/json": components["schemas"]["CreateOrderCommand"];
                    "application/*+json": components["schemas"]["CreateOrderCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CreateOrderResult"];
                        "application/json": components["schemas"]["CreateOrderResult"];
                        "text/json": components["schemas"]["CreateOrderResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CreateOrderResult"];
                        "application/json": components["schemas"]["CreateOrderResult"];
                        "text/json": components["schemas"]["CreateOrderResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/orders/{orderId}/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["InitiatePaymentCommand"];
                    "text/json": components["schemas"]["InitiatePaymentCommand"];
                    "application/*+json": components["schemas"]["InitiatePaymentCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["InitiatePaymentResult"];
                        "application/json": components["schemas"]["InitiatePaymentResult"];
                        "text/json": components["schemas"]["InitiatePaymentResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["InitiatePaymentResult"];
                        "application/json": components["schemas"]["InitiatePaymentResult"];
                        "text/json": components["schemas"]["InitiatePaymentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/orders/{orderId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrderDto"];
                        "application/json": components["schemas"]["OrderDto"];
                        "text/json": components["schemas"]["OrderDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/personal/quote": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateOrderCommand"];
                    "text/json": components["schemas"]["CreateOrderCommand"];
                    "application/*+json": components["schemas"]["CreateOrderCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommercialQuoteDto"];
                        "application/json": components["schemas"]["CommercialQuoteDto"];
                        "text/json": components["schemas"]["CommercialQuoteDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/organization/quote": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateOrderCommand"];
                    "text/json": components["schemas"]["CreateOrderCommand"];
                    "application/*+json": components["schemas"]["CreateOrderCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommercialQuoteDto"];
                        "application/json": components["schemas"]["CommercialQuoteDto"];
                        "text/json": components["schemas"]["CommercialQuoteDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    audience?: components["schemas"]["SubscriptionOwnerType"];
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommercialPlanDto"][];
                        "application/json": components["schemas"]["CommercialPlanDto"][];
                        "text/json": components["schemas"]["CommercialPlanDto"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/personal/subscription": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommercialSummaryDto"];
                        "application/json": components["schemas"]["CommercialSummaryDto"];
                        "text/json": components["schemas"]["CommercialSummaryDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/organization/subscription": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommercialSummaryDto"];
                        "application/json": components["schemas"]["CommercialSummaryDto"];
                        "text/json": components["schemas"]["CommercialSummaryDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/ai/simple-text/preflight": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AiQuotaPreflightCommand"];
                    "text/json": components["schemas"]["AiQuotaPreflightCommand"];
                    "application/*+json": components["schemas"]["AiQuotaPreflightCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AiQuotaPreflightDto"];
                        "application/json": components["schemas"]["AiQuotaPreflightDto"];
                        "text/json": components["schemas"]["AiQuotaPreflightDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/personal/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrderListResult"];
                        "application/json": components["schemas"]["OrderListResult"];
                        "text/json": components["schemas"]["OrderListResult"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateOrderCommand"];
                    "text/json": components["schemas"]["CreateOrderCommand"];
                    "application/*+json": components["schemas"]["CreateOrderCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CreateOrderResult"];
                        "application/json": components["schemas"]["CreateOrderResult"];
                        "text/json": components["schemas"]["CreateOrderResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/personal/orders/{orderId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrderDto"];
                        "application/json": components["schemas"]["OrderDto"];
                        "text/json": components["schemas"]["OrderDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/personal/orders/{orderId}/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["InitiatePaymentCommand"];
                    "text/json": components["schemas"]["InitiatePaymentCommand"];
                    "application/*+json": components["schemas"]["InitiatePaymentCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["InitiatePaymentResult"];
                        "application/json": components["schemas"]["InitiatePaymentResult"];
                        "text/json": components["schemas"]["InitiatePaymentResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/personal/subscription/downgrade": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ScheduleDowngradeCommand"];
                    "text/json": components["schemas"]["ScheduleDowngradeCommand"];
                    "application/*+json": components["schemas"]["ScheduleDowngradeCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommercialSummaryDto"];
                        "application/json": components["schemas"]["CommercialSummaryDto"];
                        "text/json": components["schemas"]["CommercialSummaryDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/commerce/organization/subscription/downgrade": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ScheduleDowngradeCommand"];
                    "text/json": components["schemas"]["ScheduleDowngradeCommand"];
                    "application/*+json": components["schemas"]["ScheduleDowngradeCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommercialSummaryDto"];
                        "application/json": components["schemas"]["CommercialSummaryDto"];
                        "text/json": components["schemas"]["CommercialSummaryDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/messaging-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["MessagingStatusResult"];
                        "application/json": components["schemas"]["MessagingStatusResult"];
                        "text/json": components["schemas"]["MessagingStatusResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/people/{personId}/communication-age": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    personId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommunicationAgeResult"];
                        "application/json": components["schemas"]["CommunicationAgeResult"];
                        "text/json": components["schemas"]["CommunicationAgeResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/people/{personId}/communication-age/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    personId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VerifyCommunicationAgeCommand"];
                    "text/json": components["schemas"]["VerifyCommunicationAgeCommand"];
                    "application/*+json": components["schemas"]["VerifyCommunicationAgeCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CommunicationAgeResult"];
                        "application/json": components["schemas"]["CommunicationAgeResult"];
                        "text/json": components["schemas"]["CommunicationAgeResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    q?: string;
                    favoritesOnly?: boolean;
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["UserContactPageResult"];
                        "application/json": components["schemas"]["UserContactPageResult"];
                        "text/json": components["schemas"]["UserContactPageResult"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SaveUserContactCommand"];
                    "text/json": components["schemas"]["SaveUserContactCommand"];
                    "application/*+json": components["schemas"]["SaveUserContactCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["UserContactResult"];
                        "application/json": components["schemas"]["UserContactResult"];
                        "text/json": components["schemas"]["UserContactResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["UserContactResult"];
                        "application/json": components["schemas"]["UserContactResult"];
                        "text/json": components["schemas"]["UserContactResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contacts/recent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["RecentContactPageResult"];
                        "application/json": components["schemas"]["RecentContactPageResult"];
                        "text/json": components["schemas"]["RecentContactPageResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contacts/{contactUserId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    contactUserId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    contactUserId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateUserContactCommand"];
                    "text/json": components["schemas"]["UpdateUserContactCommand"];
                    "application/*+json": components["schemas"]["UpdateUserContactCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["UserContactResult"];
                        "application/json": components["schemas"]["UserContactResult"];
                        "text/json": components["schemas"]["UserContactResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/me/restriction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["MemberRestrictionResult"];
                        "application/json": components["schemas"]["MemberRestrictionResult"];
                        "text/json": components["schemas"]["MemberRestrictionResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/read-states": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationPeerReadStateResult"];
                        "application/json": components["schemas"]["ConversationPeerReadStateResult"];
                        "text/json": components["schemas"]["ConversationPeerReadStateResult"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProblemDetails"];
                        "application/json": components["schemas"]["ProblemDetails"];
                        "text/json": components["schemas"]["ProblemDetails"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateManagedConversationCommand"];
                    "text/json": components["schemas"]["CreateManagedConversationCommand"];
                    "application/*+json": components["schemas"]["CreateManagedConversationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagedConversationResult"];
                        "application/json": components["schemas"]["ManagedConversationResult"];
                        "text/json": components["schemas"]["ManagedConversationResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagedConversationResult"];
                        "application/json": components["schemas"]["ManagedConversationResult"];
                        "text/json": components["schemas"]["ManagedConversationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/channels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateManagedConversationCommand"];
                    "text/json": components["schemas"]["CreateManagedConversationCommand"];
                    "application/*+json": components["schemas"]["CreateManagedConversationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagedConversationResult"];
                        "application/json": components["schemas"]["ManagedConversationResult"];
                        "text/json": components["schemas"]["ManagedConversationResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagedConversationResult"];
                        "application/json": components["schemas"]["ManagedConversationResult"];
                        "text/json": components["schemas"]["ManagedConversationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/direct": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["StartDirectConversationCommand"];
                    "text/json": components["schemas"]["StartDirectConversationCommand"];
                    "application/*+json": components["schemas"]["StartDirectConversationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["DirectConversationResult"];
                        "application/json": components["schemas"]["DirectConversationResult"];
                        "text/json": components["schemas"]["DirectConversationResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["DirectConversationResult"];
                        "application/json": components["schemas"]["DirectConversationResult"];
                        "text/json": components["schemas"]["DirectConversationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    filter?: components["schemas"]["ConversationListFilter"];
                    page?: number;
                    pageSize?: number;
                    q?: string;
                    folderId?: string;
                    scope?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationSummaryResult"][];
                        "application/json": components["schemas"]["ConversationSummaryResult"][];
                        "text/json": components["schemas"]["ConversationSummaryResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Summary مجاز گفتگو مستقل از صفحه و فیلتر Inbox
         * @description Direct، Saved، Group و Channel مجاز را با DTO موجود Inbox می‌خواند؛ archive مانع deep-link نیست. نشست، workspace جاری و participant فعال همچنان الزامی‌اند. شناسهٔ نامجاز یا context متفاوت 404 می‌گیرد. این مسیر مجوز مدیریت گروه یا ارسال پیام جدید ایجاد نمی‌کند.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationSummaryResult"];
                        "application/json": components["schemas"]["ConversationSummaryResult"];
                        "text/json": components["schemas"]["ConversationSummaryResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    beforeSequence?: number;
                    limit?: number;
                    topicId?: string;
                };
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationMessagePageResult"];
                        "application/json": components["schemas"]["ConversationMessagePageResult"];
                        "text/json": components["schemas"]["ConversationMessagePageResult"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SendMessageCommand"];
                    "text/json": components["schemas"]["SendMessageCommand"];
                    "application/*+json": components["schemas"]["SendMessageCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["MessageReceiptResult"];
                        "application/json": components["schemas"]["MessageReceiptResult"];
                        "text/json": components["schemas"]["MessageReceiptResult"];
                    };
                };
                /** @description MESSAGE_SAFETY_REVIEW_REQUIRED: وضعیت PendingReview، یا MESSAGE_SAFETY_BLOCKED: وضعیت Rejected. تغییر اعمال نشده و مجوز تحویل/دانلود تازه ایجاد نشده است. Ready فایل تأیید ایمنی نیست. پیش‌نویس حفظ شود و retry خودکار نشود؛ همان شناسه و payload همان نتیجه را می‌دهد. PendingReview وعدهٔ صف انسانی، SLA یا تأیید async نیست. دلیل داخلی و اطلاعات provider عمومی نیستند. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": {
                            /** @enum {integer} */
                            status?: 422;
                            code?: string;
                            /** @enum {string} */
                            safetyState?: "PendingReview" | "Rejected";
                            /** @enum {string} */
                            operationState?: "NotApplied";
                            /**
                             * Format: uuid
                             * @description شناسهٔ opaque رخداد ثبت‌شده؛ مجوز خواندن پرونده یا فایل نیست. در retry همان رخداد پایدار می‌ماند.
                             */
                            safetyReference?: string;
                            /** @enum {boolean} */
                            newMessageCreated?: false;
                            /** @enum {boolean} */
                            newAttachmentsBound?: false;
                            /** @enum {boolean} */
                            recipientDeliveryGranted?: false;
                            /** @enum {boolean} */
                            recipientDownloadGranted?: false;
                            /** @enum {boolean} */
                            retryable?: false;
                            /** @enum {string} */
                            requiredAction?: "KEEP_DRAFT_NO_AUTO_RETRY";
                            correlationId?: string;
                            traceId?: string;
                        };
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProblemDetails"];
                        "application/json": components["schemas"]["ProblemDetails"];
                        "text/json": components["schemas"]["ProblemDetails"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    kind?: string;
                    beforeSequence?: number;
                    limit?: number;
                };
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationMediaPageResult"];
                        "application/json": components["schemas"]["ConversationMediaPageResult"];
                        "text/json": components["schemas"]["ConversationMediaPageResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AdvanceConversationCursorCommand"];
                    "text/json": components["schemas"]["AdvanceConversationCursorCommand"];
                    "application/*+json": components["schemas"]["AdvanceConversationCursorCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationCursorStateResult"];
                        "application/json": components["schemas"]["ConversationCursorStateResult"];
                        "text/json": components["schemas"]["ConversationCursorStateResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * جزئیات مدیریتی Group یا Channel مجاز
         * @description این مسیر ManagedConversationResult برمی‌گرداند و existence check عمومی گفتگو نیست. Direct و Saved از این مسیر مدیریتی 404 می‌گیرند؛ این پاسخ به معنی نبود پیام یا تاریخچه نیست. برای deep-link مجاز از /conversations/{conversationId}/summary و برای پیام‌ها از /conversations/{conversationId}/messages استفاده شود.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagedConversationResult"];
                        "application/json": components["schemas"]["ManagedConversationResult"];
                        "text/json": components["schemas"]["ManagedConversationResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationParticipantPageResult"];
                        "application/json": components["schemas"]["ConversationParticipantPageResult"];
                        "text/json": components["schemas"]["ConversationParticipantPageResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/leave": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagedConversationResult"];
                        "application/json": components["schemas"]["ManagedConversationResult"];
                        "text/json": components["schemas"]["ManagedConversationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateConversationSettingsCommand"];
                    "text/json": components["schemas"]["UpdateConversationSettingsCommand"];
                    "application/*+json": components["schemas"]["UpdateConversationSettingsCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagedConversationResult"];
                        "application/json": components["schemas"]["ManagedConversationResult"];
                        "text/json": components["schemas"]["ManagedConversationResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/conversations/{conversationId}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationUserStateResult"];
                        "application/json": components["schemas"]["ConversationUserStateResult"];
                        "text/json": components["schemas"]["ConversationUserStateResult"];
                    };
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    conversationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ConversationUserStateResult"];
                        "application/json": components["schemas"]["ConversationUserStateResult"];
                        "text/json": components["schemas"]["ConversationUserStateResult"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/courses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. فقط Manager سازمان جاری. فهرست اعضا شامل حساب/شخص/عضویت/نقش‌های مستقل است؛ profilePhoto فقط طبق سیاست فعلی Avatar و در غیر این صورت null. کاتالوگ‌ها شامل موارد استفاده‌نشده هم هستند. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        get: {
            parameters: {
                query?: {
                    /** @description جست‌وجوی trimشده تا ۱۰۰ نویسه؛ فقط در محدودهٔ مجاز */
                    Search?: string;
                    /**
                     * @description صفحه از ۱؛ حداکثر 100000
                     * @example 1
                     */
                    Page?: number;
                    /**
                     * @description ۱ تا ۱۰۰؛ پیش‌فرض ۵۰
                     * @example 50
                     */
                    PageSize?: number;
                    status?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolPageOfCourseResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "id": "00000000-0000-0000-0000-000000000001",
                         *           "organizationId": "00000000-0000-0000-0000-000000000002",
                         *           "title": "درس",
                         *           "status": "Active"
                         *         }
                         *       ]
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolPageOfCourseResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "id": "00000000-0000-0000-0000-000000000001",
                         *           "organizationId": "00000000-0000-0000-0000-000000000002",
                         *           "title": "درس",
                         *           "status": "Active"
                         *         }
                         *       ]
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolPageOfCourseResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateCourseCommand"];
                    "text/json": components["schemas"]["CreateCourseCommand"];
                    "application/*+json": components["schemas"]["CreateCourseCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CourseResult"];
                        "application/json": components["schemas"]["CourseResult"];
                        "text/json": components["schemas"]["CourseResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboards/student": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentDashboardDto"];
                        "application/json": components["schemas"]["StudentDashboardDto"];
                        "text/json": components["schemas"]["StudentDashboardDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboards/parent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ParentDashboardDto"];
                        "application/json": components["schemas"]["ParentDashboardDto"];
                        "text/json": components["schemas"]["ParentDashboardDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboards/teacher": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["TeacherDashboardDto"];
                        "application/json": components["schemas"]["TeacherDashboardDto"];
                        "text/json": components["schemas"]["TeacherDashboardDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboards/manager": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagerDashboardDto"];
                        "application/json": components["schemas"]["ManagerDashboardDto"];
                        "text/json": components["schemas"]["ManagerDashboardDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/evaluations/queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    assignmentId?: string;
                    classId?: string;
                    reviewStatus?: string;
                    isLate?: boolean;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["EvaluationQueueItemResult"][];
                        "application/json": components["schemas"]["EvaluationQueueItemResult"][];
                        "text/json": components["schemas"]["EvaluationQueueItemResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/evaluation/submission": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionForEvaluationResult"];
                        "application/json": components["schemas"]["SubmissionForEvaluationResult"];
                        "text/json": components["schemas"]["SubmissionForEvaluationResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/evaluation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["EvaluatorEvaluationResult"];
                        "application/json": components["schemas"]["EvaluatorEvaluationResult"];
                        "text/json": components["schemas"]["EvaluatorEvaluationResult"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SaveEvaluationDraftCommand"];
                    "text/json": components["schemas"]["SaveEvaluationDraftCommand"];
                    "application/*+json": components["schemas"]["SaveEvaluationDraftCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["EvaluatorEvaluationResult"];
                        "application/json": components["schemas"]["EvaluatorEvaluationResult"];
                        "text/json": components["schemas"]["EvaluatorEvaluationResult"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/evaluation/release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ReleaseEvaluationCommand"];
                    "text/json": components["schemas"]["ReleaseEvaluationCommand"];
                    "application/*+json": components["schemas"]["ReleaseEvaluationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["GradeReleaseResult"];
                        "application/json": components["schemas"]["GradeReleaseResult"];
                        "text/json": components["schemas"]["GradeReleaseResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/evaluation/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CorrectReleasedEvaluationCommand"];
                    "text/json": components["schemas"]["CorrectReleasedEvaluationCommand"];
                    "application/*+json": components["schemas"]["CorrectReleasedEvaluationCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["EvaluatorEvaluationResult"];
                        "application/json": components["schemas"]["EvaluatorEvaluationResult"];
                        "text/json": components["schemas"]["EvaluatorEvaluationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentReleasedResult"];
                        "application/json": components["schemas"]["StudentReleasedResult"];
                        "text/json": components["schemas"]["StudentReleasedResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/guardian-result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ParentReleasedResult"];
                        "application/json": components["schemas"]["ParentReleasedResult"];
                        "text/json": components["schemas"]["ParentReleasedResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/grading": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    classId?: string;
                    status?: string;
                };
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamGradingQueueItemDto"][];
                        "application/json": components["schemas"]["ExamGradingQueueItemDto"][];
                        "text/json": components["schemas"]["ExamGradingQueueItemDto"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/grading": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamGradeDto"];
                        "application/json": components["schemas"]["ExamGradeDto"];
                        "text/json": components["schemas"]["ExamGradeDto"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamGradeDto"];
                        "application/json": components["schemas"]["ExamGradeDto"];
                        "text/json": components["schemas"]["ExamGradeDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/grading/questions/{attemptQuestionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                    attemptQuestionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["GradeExamQuestionCommand"];
                    "text/json": components["schemas"]["GradeExamQuestionCommand"];
                    "application/*+json": components["schemas"]["GradeExamQuestionCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamGradeDto"];
                        "application/json": components["schemas"]["ExamGradeDto"];
                        "text/json": components["schemas"]["ExamGradeDto"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/grading/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CompleteExamGradeCommand"];
                    "text/json": components["schemas"]["CompleteExamGradeCommand"];
                    "application/*+json": components["schemas"]["CompleteExamGradeCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamGradeDto"];
                        "application/json": components["schemas"]["ExamGradeDto"];
                        "text/json": components["schemas"]["ExamGradeDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/grade/release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ReleaseExamGradeCommand"];
                    "text/json": components["schemas"]["ReleaseExamGradeCommand"];
                    "application/*+json": components["schemas"]["ReleaseExamGradeCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamGradeReleaseDto"];
                        "application/json": components["schemas"]["ExamGradeReleaseDto"];
                        "text/json": components["schemas"]["ExamGradeReleaseDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/grade/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CorrectReleasedExamGradeCommand"];
                    "text/json": components["schemas"]["CorrectReleasedExamGradeCommand"];
                    "application/*+json": components["schemas"]["CorrectReleasedExamGradeCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamGradeDto"];
                        "application/json": components["schemas"]["ExamGradeDto"];
                        "text/json": components["schemas"]["ExamGradeDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentExamResultDto"];
                        "application/json": components["schemas"]["StudentExamResultDto"];
                        "text/json": components["schemas"]["StudentExamResultDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/guardian-result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["GuardianExamResultDto"];
                        "application/json": components["schemas"]["GuardianExamResultDto"];
                        "text/json": components["schemas"]["GuardianExamResultDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/exams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateExamDraftCommand"];
                    "text/json": components["schemas"]["CreateExamDraftCommand"];
                    "application/*+json": components["schemas"]["CreateExamDraftCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamEditorDto"];
                        "application/json": components["schemas"]["ExamEditorDto"];
                        "text/json": components["schemas"]["ExamEditorDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentExamSummary"][];
                        "application/json": components["schemas"]["StudentExamSummary"][];
                        "text/json": components["schemas"]["StudentExamSummary"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/editor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamEditorDto"];
                        "application/json": components["schemas"]["ExamEditorDto"];
                        "text/json": components["schemas"]["ExamEditorDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/teacher-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamTeacherPreview"];
                        "application/json": components["schemas"]["ExamTeacherPreview"];
                        "text/json": components["schemas"]["ExamTeacherPreview"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateExamDraftCommand"];
                    "text/json": components["schemas"]["UpdateExamDraftCommand"];
                    "application/*+json": components["schemas"]["UpdateExamDraftCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamEditorDto"];
                        "application/json": components["schemas"]["ExamEditorDto"];
                        "text/json": components["schemas"]["ExamEditorDto"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/questions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AddExamQuestionCommand"];
                    "text/json": components["schemas"]["AddExamQuestionCommand"];
                    "application/*+json": components["schemas"]["AddExamQuestionCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamEditorDto"];
                        "application/json": components["schemas"]["ExamEditorDto"];
                        "text/json": components["schemas"]["ExamEditorDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/questions/{questionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                    questionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["DeleteExamQuestionCommand"];
                    "text/json": components["schemas"]["DeleteExamQuestionCommand"];
                    "application/*+json": components["schemas"]["DeleteExamQuestionCommand"];
                };
            };
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                    questionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateExamQuestionCommand"];
                    "text/json": components["schemas"]["UpdateExamQuestionCommand"];
                    "application/*+json": components["schemas"]["UpdateExamQuestionCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamEditorDto"];
                        "application/json": components["schemas"]["ExamEditorDto"];
                        "text/json": components["schemas"]["ExamEditorDto"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/student-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentSafeExamPreview"];
                        "application/json": components["schemas"]["StudentSafeExamPreview"];
                        "text/json": components["schemas"]["StudentSafeExamPreview"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["PublishExamCommand"];
                    "text/json": components["schemas"]["PublishExamCommand"];
                    "application/*+json": components["schemas"]["PublishExamCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamEditorDto"];
                        "application/json": components["schemas"]["ExamEditorDto"];
                        "text/json": components["schemas"]["ExamEditorDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateNextExamVersionCommand"];
                    "text/json": components["schemas"]["CreateNextExamVersionCommand"];
                    "application/*+json": components["schemas"]["CreateNextExamVersionCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamEditorDto"];
                        "application/json": components["schemas"]["ExamEditorDto"];
                        "text/json": components["schemas"]["ExamEditorDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/attempts/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["StartExamCommand"];
                    "text/json": components["schemas"]["StartExamCommand"];
                    "application/*+json": components["schemas"]["StartExamCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentExamAttemptDto"];
                        "application/json": components["schemas"]["StudentExamAttemptDto"];
                        "text/json": components["schemas"]["StudentExamAttemptDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/attempts/me/active": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentExamAttemptDto"];
                        "application/json": components["schemas"]["StudentExamAttemptDto"];
                        "text/json": components["schemas"]["StudentExamAttemptDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentExamAttemptDto"];
                        "application/json": components["schemas"]["StudentExamAttemptDto"];
                        "text/json": components["schemas"]["StudentExamAttemptDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exams/{examId}/attempts/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    examId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentExamAttemptSummaryDto"][];
                        "application/json": components["schemas"]["StudentExamAttemptSummaryDto"][];
                        "text/json": components["schemas"]["StudentExamAttemptSummaryDto"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/write-lease": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamWriteLeaseDto"];
                        "application/json": components["schemas"]["ExamWriteLeaseDto"];
                        "text/json": components["schemas"]["ExamWriteLeaseDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/write-lease/transfer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamWriteLeaseDto"];
                        "application/json": components["schemas"]["ExamWriteLeaseDto"];
                        "text/json": components["schemas"]["ExamWriteLeaseDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/answers/{attemptQuestionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                    attemptQuestionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SaveExamAnswerCommand"];
                    "text/json": components["schemas"]["SaveExamAnswerCommand"];
                    "application/*+json": components["schemas"]["SaveExamAnswerCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamAnswerReceiptDto"];
                        "application/json": components["schemas"]["ExamAnswerReceiptDto"];
                        "text/json": components["schemas"]["ExamAnswerReceiptDto"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/answers/{attemptQuestionId}/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * اتصال فایل آماده به نسخهٔ پاسخ آزمون
         * @description ابتدا POST /api/v1/files و وضعیت Ready لازم است. سیاست همان QuestionVersion تثبیت‌شده، مالکیت فایل، سازمان، Enrollment جاری، مهلت سرور، write lease و ExpectedRevisionNumber بررسی می‌شوند. ClientOperationId برای retry همان درخواست ثابت است؛ payload متفاوت با همان شناسه 409 می‌گیرد. پاسخ ExamAnswerReceiptDto و AnswerSetVersion جدید است. حذف پیوست فایل یا تاریخچه را پاک نمی‌کند. ذخیرهٔ متن با PUT answers فایل‌های جاری را حفظ می‌کند. پس از Finalize تغییر جدید مجاز نیست. UserId یا FileAssetId به‌تنهایی مجوز نیست.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                    attemptQuestionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AttachExamAnswerFileCommand"];
                    "text/json": components["schemas"]["AttachExamAnswerFileCommand"];
                    "application/*+json": components["schemas"]["AttachExamAnswerFileCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamAnswerReceiptDto"];
                        "application/json": components["schemas"]["ExamAnswerReceiptDto"];
                        "text/json": components["schemas"]["ExamAnswerReceiptDto"];
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/answers/{attemptQuestionId}/attachments/{fileAssetId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * حذف پیوست با ایجاد نسخهٔ جدید پاسخ
         * @description ابتدا POST /api/v1/files و وضعیت Ready لازم است. سیاست همان QuestionVersion تثبیت‌شده، مالکیت فایل، سازمان، Enrollment جاری، مهلت سرور، write lease و ExpectedRevisionNumber بررسی می‌شوند. ClientOperationId برای retry همان درخواست ثابت است؛ payload متفاوت با همان شناسه 409 می‌گیرد. پاسخ ExamAnswerReceiptDto و AnswerSetVersion جدید است. حذف پیوست فایل یا تاریخچه را پاک نمی‌کند. ذخیرهٔ متن با PUT answers فایل‌های جاری را حفظ می‌کند. پس از Finalize تغییر جدید مجاز نیست. UserId یا FileAssetId به‌تنهایی مجوز نیست.
         */
        delete: {
            parameters: {
                query?: {
                    ClientOperationId?: string;
                    WriteLeaseVersion?: number;
                    ExpectedRevisionNumber?: number;
                };
                header?: never;
                path: {
                    attemptId: string;
                    attemptQuestionId: string;
                    fileAssetId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamAnswerReceiptDto"];
                        "application/json": components["schemas"]["ExamAnswerReceiptDto"];
                        "text/json": components["schemas"]["ExamAnswerReceiptDto"];
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails: سیاست/سقف پیوست 400؛ احراز هویت 401؛ نقش نامجاز 403؛ فایل/تلاش نامجاز 404؛ نسخه، lease، مهلت، فایل غیرآماده یا Finalize برابر 409. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/answers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["StudentExamAnswersDto"];
                        "application/json": components["schemas"]["StudentExamAnswersDto"];
                        "text/json": components["schemas"]["StudentExamAnswersDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/finalize": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["FinalizeExamCommand"];
                    "text/json": components["schemas"]["FinalizeExamCommand"];
                    "application/*+json": components["schemas"]["FinalizeExamCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamFinalReceiptDto"];
                        "application/json": components["schemas"]["ExamFinalReceiptDto"];
                        "text/json": components["schemas"]["ExamFinalReceiptDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/exam-attempts/{attemptId}/receipt": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ExamFinalReceiptDto"];
                        "application/json": components["schemas"]["ExamFinalReceiptDto"];
                        "text/json": components["schemas"]["ExamFinalReceiptDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: {
                    workspaceScope?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        File?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["FileAssetResult"];
                        "application/json": components["schemas"]["FileAssetResult"];
                        "text/json": components["schemas"]["FileAssetResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files/{fileId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    fileId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["FileAssetResult"];
                        "application/json": components["schemas"]["FileAssetResult"];
                        "text/json": components["schemas"]["FileAssetResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: {
                    expectedRowVersion?: string;
                };
                header?: never;
                path: {
                    fileId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["FileAssetResult"];
                        "application/json": components["schemas"]["FileAssetResult"];
                        "text/json": components["schemas"]["FileAssetResult"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files/{fileId}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * دانلود بایت فایل با مجوز جاری
         * @description پاسخ موفق بایت خام فایل است، نه JSON یا FileStreamResult سریال‌شده. Content-Type از فایل معتبر و Content-Disposition از نام دانلود تعیین می‌شود. Ready به‌تنهایی مجوز دانلود نیست؛ فایل unattached طبق scope و policy ممکن است 404 بدهد. هر درخواست، نشست و دسترسی جاری را بررسی می‌کند. Range روی stream قابل seek پشتیبانی می‌شود؛ Cache-Control=private, no-store و Vary=Authorization است.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    fileId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description فایل کامل؛ مصرف‌کننده باید bytes یا Blob بخواند. */
                200: {
                    headers: {
                        /** @description MIME واقعی فایل طبق metadata معتبر؛ ممکن است image/png، image/jpeg، application/pdf یا text/plain باشد. */
                        "Content-Type"?: string;
                        /** @description attachment؛ نام دانلود با encoding مناسب */
                        "Content-Disposition"?: string;
                        /** @description اندازهٔ بدنه بر حسب بایت */
                        "Content-Length"?: number;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/octet-stream": string;
                    };
                };
                /** @description بخشی از بایت‌ها برای Range معتبر روی stream قابل seek؛ Content-Range مشخص است. */
                206: {
                    headers: {
                        /** @description MIME واقعی فایل طبق metadata معتبر؛ ممکن است image/png، image/jpeg، application/pdf یا text/plain باشد. */
                        "Content-Type"?: string;
                        /** @description attachment؛ نام دانلود با encoding مناسب */
                        "Content-Disposition"?: string;
                        /** @description اندازهٔ بدنه بر حسب بایت */
                        "Content-Length"?: number;
                        /** @description بازهٔ واقعی بایت‌ها و اندازهٔ کل */
                        "Content-Range"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/octet-stream": string;
                    };
                };
                /** @description ProblemDetails؛ خطای JSON نباید به‌عنوان فایل موفق ذخیره شود. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ خطای JSON نباید به‌عنوان فایل موفق ذخیره شود. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ خطای JSON نباید به‌عنوان فایل موفق ذخیره شود. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ خطای JSON نباید به‌عنوان فایل موفق ذخیره شود. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description Range خارج محدوده است؛ پاسخ موفق فایل نیست. */
                416: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description ProblemDetails؛ خطای JSON نباید به‌عنوان فایل موفق ذخیره شود. */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/guardian/children": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AuthorizedChildResult"][];
                        "application/json": components["schemas"]["AuthorizedChildResult"][];
                        "text/json": components["schemas"]["AuthorizedChildResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/guardian/children/{organizationPersonId}/select": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    organizationPersonId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AccessContext"];
                        "application/json": components["schemas"]["AccessContext"];
                        "text/json": components["schemas"]["AccessContext"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/guardian/relations/{organizationPersonId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    organizationPersonId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["GuardianRelationSummaryResult"];
                        "application/json": components["schemas"]["GuardianRelationSummaryResult"];
                        "text/json": components["schemas"]["GuardianRelationSummaryResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description inbox دعوت‌های حساب احرازشده؛ دعوت والد نیازمند requiresGuardianConsent و تأیید صریح است. organizationPersonId متعلق به Person Link است و با guardianLearnerOrganizationPersonId یکی نیست. */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example [
                         *       {
                         *         "id": "00000000-0000-0000-0000-000000000001",
                         *         "organizationId": "00000000-0000-0000-0000-000000000002",
                         *         "organizationName": "آموزشگاه",
                         *         "invitedByUserId": "00000000-0000-0000-0000-000000000003",
                         *         "role": "Parent",
                         *         "status": "Pending",
                         *         "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *         "organizationPersonId": null,
                         *         "organizationPersonDisplayName": null,
                         *         "guardianLearnerOrganizationPersonId": "00000000-0000-0000-0000-000000000004",
                         *         "guardianLearnerDisplayName": "فراگیر",
                         *         "requiresPersonLinkConsent": false,
                         *         "requiresGuardianConsent": true,
                         *         "nextAction": "CONFIRM_GUARDIAN_RELATION"
                         *       }
                         *     ]
                         */
                        "text/plain": components["schemas"]["InvitationResult"][];
                        /**
                         * @example [
                         *       {
                         *         "id": "00000000-0000-0000-0000-000000000001",
                         *         "organizationId": "00000000-0000-0000-0000-000000000002",
                         *         "organizationName": "آموزشگاه",
                         *         "invitedByUserId": "00000000-0000-0000-0000-000000000003",
                         *         "role": "Parent",
                         *         "status": "Pending",
                         *         "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *         "organizationPersonId": null,
                         *         "organizationPersonDisplayName": null,
                         *         "guardianLearnerOrganizationPersonId": "00000000-0000-0000-0000-000000000004",
                         *         "guardianLearnerDisplayName": "فراگیر",
                         *         "requiresPersonLinkConsent": false,
                         *         "requiresGuardianConsent": true,
                         *         "nextAction": "CONFIRM_GUARDIAN_RELATION"
                         *       }
                         *     ]
                         */
                        "application/json": components["schemas"]["InvitationResult"][];
                        /**
                         * @example [
                         *       {
                         *         "id": "00000000-0000-0000-0000-000000000001",
                         *         "organizationId": "00000000-0000-0000-0000-000000000002",
                         *         "organizationName": "آموزشگاه",
                         *         "invitedByUserId": "00000000-0000-0000-0000-000000000003",
                         *         "role": "Parent",
                         *         "status": "Pending",
                         *         "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *         "organizationPersonId": null,
                         *         "organizationPersonDisplayName": null,
                         *         "guardianLearnerOrganizationPersonId": "00000000-0000-0000-0000-000000000004",
                         *         "guardianLearnerDisplayName": "فراگیر",
                         *         "requiresPersonLinkConsent": false,
                         *         "requiresGuardianConsent": true,
                         *         "nextAction": "CONFIRM_GUARDIAN_RELATION"
                         *       }
                         *     ]
                         */
                        "text/json": components["schemas"]["InvitationResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/invitations/{invitationId}/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description پذیرش فقط توسط حساب مقصد در نشست معتبر. دعوت Person Link نیازمند confirmPersonLink و دعوت والد نیازمند confirmGuardianRelation=true است. پذیرش والد، Membership/Role و GuardianRelation را اتمیک ثبت می‌کند؛ بازپخش رسید رابطهٔ پایان‌یافته را فعال نمی‌کند. */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    invitationId: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    /**
                     * @example {
                     *       "confirmPersonLink": false,
                     *       "confirmGuardianRelation": true
                     *     }
                     */
                    "application/json": components["schemas"]["AcceptInvitationCommand"];
                    /**
                     * @example {
                     *       "confirmPersonLink": false,
                     *       "confirmGuardianRelation": true
                     *     }
                     */
                    "text/json": components["schemas"]["AcceptInvitationCommand"];
                    /**
                     * @example {
                     *       "confirmPersonLink": false,
                     *       "confirmGuardianRelation": true
                     *     }
                     */
                    "application/*+json": components["schemas"]["AcceptInvitationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "invitationId": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "organizationName": "آموزشگاه",
                         *       "membershipId": "00000000-0000-0000-0000-000000000003",
                         *       "roleAssignmentId": "00000000-0000-0000-0000-000000000004",
                         *       "role": "Parent",
                         *       "alreadyAccepted": false,
                         *       "organizationPersonId": null,
                         *       "guardianRelationId": "00000000-0000-0000-0000-000000000005"
                         *     }
                         */
                        "text/plain": components["schemas"]["AcceptInvitationResult"];
                        /**
                         * @example {
                         *       "invitationId": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "organizationName": "آموزشگاه",
                         *       "membershipId": "00000000-0000-0000-0000-000000000003",
                         *       "roleAssignmentId": "00000000-0000-0000-0000-000000000004",
                         *       "role": "Parent",
                         *       "alreadyAccepted": false,
                         *       "organizationPersonId": null,
                         *       "guardianRelationId": "00000000-0000-0000-0000-000000000005"
                         *     }
                         */
                        "application/json": components["schemas"]["AcceptInvitationResult"];
                        /**
                         * @example {
                         *       "invitationId": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "organizationName": "آموزشگاه",
                         *       "membershipId": "00000000-0000-0000-0000-000000000003",
                         *       "roleAssignmentId": "00000000-0000-0000-0000-000000000004",
                         *       "role": "Parent",
                         *       "alreadyAccepted": false,
                         *       "organizationPersonId": null,
                         *       "guardianRelationId": "00000000-0000-0000-0000-000000000005"
                         *     }
                         */
                        "text/json": components["schemas"]["AcceptInvitationResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "GUARDIAN_INVITATION_CONSENT_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/invitations/{invitationId}/decline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    invitationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["DeclineInvitationResult"];
                        "application/json": components["schemas"]["DeclineInvitationResult"];
                        "text/json": components["schemas"]["DeclineInvitationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/messaging/privacy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["MessagingPrivacySettingsResult"];
                        "application/json": components["schemas"]["MessagingPrivacySettingsResult"];
                        "text/json": components["schemas"]["MessagingPrivacySettingsResult"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateMessagingPrivacyCommand"];
                    "text/json": components["schemas"]["UpdateMessagingPrivacyCommand"];
                    "application/*+json": components["schemas"]["UpdateMessagingPrivacyCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["MessagingPrivacySettingsResult"];
                        "application/json": components["schemas"]["MessagingPrivacySettingsResult"];
                        "text/json": components["schemas"]["MessagingPrivacySettingsResult"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/messaging/blocks/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    userId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["UserBlockResult"];
                        "application/json": components["schemas"]["UserBlockResult"];
                        "text/json": components["schemas"]["UserBlockResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["UserBlockResult"];
                        "application/json": components["schemas"]["UserBlockResult"];
                        "text/json": components["schemas"]["UserBlockResult"];
                    };
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    userId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/messaging/blocks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["BlockedUserResult"][];
                        "application/json": components["schemas"]["BlockedUserResult"][];
                        "text/json": components["schemas"]["BlockedUserResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notification-preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    organizationId?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["NotificationPreferenceItem"][];
                        "application/json": components["schemas"]["NotificationPreferenceItem"][];
                        "text/json": components["schemas"]["NotificationPreferenceItem"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notification-preferences/{category}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: {
                    organizationId?: string;
                };
                header?: never;
                path: {
                    category: components["schemas"]["NotificationPreferenceCategory"];
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateNotificationPreferenceCommand"];
                    "text/json": components["schemas"]["UpdateNotificationPreferenceCommand"];
                    "application/*+json": components["schemas"]["UpdateNotificationPreferenceCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["NotificationPreferenceItem"];
                        "application/json": components["schemas"]["NotificationPreferenceItem"];
                        "text/json": components["schemas"]["NotificationPreferenceItem"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    Page?: number;
                    PageSize?: number;
                    UnreadOnly?: boolean;
                    Category?: string;
                    OrganizationId?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["NotificationPage"];
                        "application/json": components["schemas"]["NotificationPage"];
                        "text/json": components["schemas"]["NotificationPage"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications/{notificationId}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    notificationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["NotificationItem"];
                        "application/json": components["schemas"]["NotificationItem"];
                        "text/json": components["schemas"]["NotificationItem"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/official-spaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OfficialSpacesPairResult"];
                        "application/json": components["schemas"]["OfficialSpacesPairResult"];
                        "text/json": components["schemas"]["OfficialSpacesPairResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/classes/{classId}/official-spaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OfficialSpacesPairResult"];
                        "application/json": components["schemas"]["OfficialSpacesPairResult"];
                        "text/json": components["schemas"]["OfficialSpacesPairResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/classes/{classId}/official-spaces/activities/{eventId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                    eventId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AcademicActivityDeliveryResult"][];
                        "application/json": components["schemas"]["AcademicActivityDeliveryResult"][];
                        "text/json": components["schemas"]["AcademicActivityDeliveryResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/classes/{classId}/official-spaces/activities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    kind?: components["schemas"]["AcademicActivityKind"];
                    sourceVersionId?: string;
                    revision?: number;
                };
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AcademicActivityDeliveryResult"][];
                        "application/json": components["schemas"]["AcademicActivityDeliveryResult"][];
                        "text/json": components["schemas"]["AcademicActivityDeliveryResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. فقط Manager سازمان جاری. فهرست اعضا شامل حساب/شخص/عضویت/نقش‌های مستقل است؛ profilePhoto فقط طبق سیاست فعلی Avatar و در غیر این صورت null. کاتالوگ‌ها شامل موارد استفاده‌نشده هم هستند. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        get: {
            parameters: {
                query?: {
                    /** @description جست‌وجوی trimشده تا ۱۰۰ نویسه؛ فقط در محدودهٔ مجاز */
                    Search?: string;
                    Role?: string;
                    Status?: string;
                    /**
                     * @description صفحه از ۱؛ حداکثر 100000
                     * @example 1
                     */
                    Page?: number;
                    /**
                     * @description ۱ تا ۱۰۰؛ پیش‌فرض ۵۰
                     * @example 50
                     */
                    PageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolPageOfSchoolMemberResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "userId": "00000000-0000-0000-0000-000000000001",
                         *           "personId": null,
                         *           "organizationPersonId": null,
                         *           "displayName": "کاربر",
                         *           "username": "test.user",
                         *           "profilePhoto": null,
                         *           "membershipId": "00000000-0000-0000-0000-000000000002",
                         *           "membershipStatus": "Active",
                         *           "activeRoles": [
                         *             "Teacher"
                         *           ],
                         *           "roleAssignments": [
                         *             {
                         *               "roleAssignmentId": "00000000-0000-0000-0000-000000000003",
                         *               "role": "Teacher",
                         *               "status": "Active",
                         *               "assignedAtUtc": "2026-10-28T12:00:00Z",
                         *               "endedAtUtc": null,
                         *               "version": "AAAAAAAAAAE="
                         *             }
                         *           ],
                         *           "version": "AAAAAAAAAAE="
                         *         }
                         *       ]
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolPageOfSchoolMemberResult"];
                        /**
                         * @example {
                         *       "dataAsOfUtc": "2026-10-28T12:00:00Z",
                         *       "page": 1,
                         *       "pageSize": 50,
                         *       "totalCount": 1,
                         *       "items": [
                         *         {
                         *           "userId": "00000000-0000-0000-0000-000000000001",
                         *           "personId": null,
                         *           "organizationPersonId": null,
                         *           "displayName": "کاربر",
                         *           "username": "test.user",
                         *           "profilePhoto": null,
                         *           "membershipId": "00000000-0000-0000-0000-000000000002",
                         *           "membershipStatus": "Active",
                         *           "activeRoles": [
                         *             "Teacher"
                         *           ],
                         *           "roleAssignments": [
                         *             {
                         *               "roleAssignmentId": "00000000-0000-0000-0000-000000000003",
                         *               "role": "Teacher",
                         *               "status": "Active",
                         *               "assignedAtUtc": "2026-10-28T12:00:00Z",
                         *               "endedAtUtc": null,
                         *               "version": "AAAAAAAAAAE="
                         *             }
                         *           ],
                         *           "version": "AAAAAAAAAAE="
                         *         }
                         *       ]
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolPageOfSchoolMemberResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/people": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    search?: string;
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrganizationPeoplePage"];
                        "application/json": components["schemas"]["OrganizationPeoplePage"];
                        "text/json": components["schemas"]["OrganizationPeoplePage"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateOrganizationPersonCommand"];
                    "text/json": components["schemas"]["CreateOrganizationPersonCommand"];
                    "application/*+json": components["schemas"]["CreateOrganizationPersonCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrganizationPersonDto"];
                        "application/json": components["schemas"]["OrganizationPersonDto"];
                        "text/json": components["schemas"]["OrganizationPersonDto"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrganizationPersonDto"];
                        "application/json": components["schemas"]["OrganizationPersonDto"];
                        "text/json": components["schemas"]["OrganizationPersonDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/people/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrganizationPersonDto"];
                        "application/json": components["schemas"]["OrganizationPersonDto"];
                        "text/json": components["schemas"]["OrganizationPersonDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateOrganizationPersonNamesCommand"];
                    "text/json": components["schemas"]["UpdateOrganizationPersonNamesCommand"];
                    "application/*+json": components["schemas"]["UpdateOrganizationPersonNamesCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrganizationPersonDto"];
                        "application/json": components["schemas"]["OrganizationPersonDto"];
                        "text/json": components["schemas"]["OrganizationPersonDto"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/organization/people/{id}/end": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["OnboardingStateCommand"];
                    "text/json": components["schemas"]["OnboardingStateCommand"];
                    "application/*+json": components["schemas"]["OnboardingStateCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["OrganizationPersonDto"];
                        "application/json": components["schemas"]["OrganizationPersonDto"];
                        "text/json": components["schemas"]["OrganizationPersonDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/people/{id}/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreatePersonLinkInvitationCommand"];
                    "text/json": components["schemas"]["CreatePersonLinkInvitationCommand"];
                    "application/*+json": components["schemas"]["CreatePersonLinkInvitationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonLinkInvitationDto"];
                        "application/json": components["schemas"]["PersonLinkInvitationDto"];
                        "text/json": components["schemas"]["PersonLinkInvitationDto"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonLinkInvitationDto"];
                        "application/json": components["schemas"]["PersonLinkInvitationDto"];
                        "text/json": components["schemas"]["PersonLinkInvitationDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/people/{id}/invitations/{invitationId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    invitationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["OnboardingStateCommand"];
                    "text/json": components["schemas"]["OnboardingStateCommand"];
                    "application/*+json": components["schemas"]["OnboardingStateCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonLinkInvitationDto"];
                        "application/json": components["schemas"]["PersonLinkInvitationDto"];
                        "text/json": components["schemas"]["PersonLinkInvitationDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/people/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    q?: string;
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PeopleSearchPageResult"];
                        "application/json": components["schemas"]["PeopleSearchPageResult"];
                        "text/json": components["schemas"]["PeopleSearchPageResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/people/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ResolvePersonCommand"];
                    "text/json": components["schemas"]["ResolvePersonCommand"];
                    "application/*+json": components["schemas"]["ResolvePersonCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PeopleResolveResult"];
                        "application/json": components["schemas"]["PeopleResolveResult"];
                        "text/json": components["schemas"]["PeopleResolveResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassDto"][];
                        "application/json": components["schemas"]["PersonalClassDto"][];
                        "text/json": components["schemas"]["PersonalClassDto"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreatePersonalClassCommand"];
                    "text/json": components["schemas"]["CreatePersonalClassCommand"];
                    "application/*+json": components["schemas"]["CreatePersonalClassCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassDto"];
                        "application/json": components["schemas"]["PersonalClassDto"];
                        "text/json": components["schemas"]["PersonalClassDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes/{classId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassDto"];
                        "application/json": components["schemas"]["PersonalClassDto"];
                        "text/json": components["schemas"]["PersonalClassDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes/{classId}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassDto"];
                        "application/json": components["schemas"]["PersonalClassDto"];
                        "text/json": components["schemas"]["PersonalClassDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes/{classId}/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["InvitePersonalClassStudentCommand"];
                    "text/json": components["schemas"]["InvitePersonalClassStudentCommand"];
                    "application/*+json": components["schemas"]["InvitePersonalClassStudentCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassInvitationDto"];
                        "application/json": components["schemas"]["PersonalClassInvitationDto"];
                        "text/json": components["schemas"]["PersonalClassInvitationDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassInvitationDto"][];
                        "application/json": components["schemas"]["PersonalClassInvitationDto"][];
                        "text/json": components["schemas"]["PersonalClassInvitationDto"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes/invitations/{invitationId}/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    invitationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassDto"];
                        "application/json": components["schemas"]["PersonalClassDto"];
                        "text/json": components["schemas"]["PersonalClassDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes/{classId}/participants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["PersonalClassParticipantDto"][];
                        "application/json": components["schemas"]["PersonalClassParticipantDto"][];
                        "text/json": components["schemas"]["PersonalClassParticipantDto"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/personal-classes/{classId}/participants/{participantId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                    participantId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CurrentUserResult"];
                        "application/json": components["schemas"]["CurrentUserResult"];
                        "text/json": components["schemas"]["CurrentUserResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/profile-photo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SetProfilePhotoCommand"];
                    "text/json": components["schemas"]["SetProfilePhotoCommand"];
                    "application/*+json": components["schemas"]["SetProfilePhotoCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProfilePhotoResult3"];
                        "application/json": components["schemas"]["ProfilePhotoResult3"];
                        "text/json": components["schemas"]["ProfilePhotoResult3"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CompleteProfileCommand"];
                    "text/json": components["schemas"]["CompleteProfileCommand"];
                    "application/*+json": components["schemas"]["CompleteProfileCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["CurrentUserResult"];
                        "application/json": components["schemas"]["CurrentUserResult"];
                        "text/json": components["schemas"]["CurrentUserResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/realtime/changes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    cursor?: string;
                    limit?: number;
                    scope?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AccountChangePageResult"];
                        "application/json": components["schemas"]["AccountChangePageResult"];
                        "text/json": components["schemas"]["AccountChangePageResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProblemDetails"];
                        "application/json": components["schemas"]["ProblemDetails"];
                        "text/json": components["schemas"]["ProblemDetails"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProblemDetails"];
                        "application/json": components["schemas"]["ProblemDetails"];
                        "text/json": components["schemas"]["ProblemDetails"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProblemDetails"];
                        "application/json": components["schemas"]["ProblemDetails"];
                        "text/json": components["schemas"]["ProblemDetails"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProblemDetails"];
                        "application/json": components["schemas"]["ProblemDetails"];
                        "text/json": components["schemas"]["ProblemDetails"];
                    };
                };
                /** @description Service Unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ProblemDetails"];
                        "application/json": components["schemas"]["ProblemDetails"];
                        "text/json": components["schemas"]["ProblemDetails"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateReportExportCommand"];
                    "text/json": components["schemas"]["CreateReportExportCommand"];
                    "application/*+json": components["schemas"]["CreateReportExportCommand"];
                };
            };
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportExportJobResult"];
                        "application/json": components["schemas"]["ReportExportJobResult"];
                        "text/json": components["schemas"]["ReportExportJobResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/exports/{jobId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    jobId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportExportJobResult"];
                        "application/json": components["schemas"]["ReportExportJobResult"];
                        "text/json": components["schemas"]["ReportExportJobResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/exports/{jobId}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    jobId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["FileStreamResult"];
                        "application/json": components["schemas"]["FileStreamResult"];
                        "text/json": components["schemas"]["FileStreamResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/student/attendance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AttendanceReportPageOfStudentAttendanceReportItem"];
                        "application/json": components["schemas"]["AttendanceReportPageOfStudentAttendanceReportItem"];
                        "text/json": components["schemas"]["AttendanceReportPageOfStudentAttendanceReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/student/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfStudentAssignmentReportItem"];
                        "application/json": components["schemas"]["ReportPageOfStudentAssignmentReportItem"];
                        "text/json": components["schemas"]["ReportPageOfStudentAssignmentReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/student/exams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfStudentExamReportItem"];
                        "application/json": components["schemas"]["ReportPageOfStudentExamReportItem"];
                        "text/json": components["schemas"]["ReportPageOfStudentExamReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/student/grades": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfStudentReleasedGradeReportItem"];
                        "application/json": components["schemas"]["ReportPageOfStudentReleasedGradeReportItem"];
                        "text/json": components["schemas"]["ReportPageOfStudentReleasedGradeReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/parent/attendance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AttendanceReportPageOfParentAttendanceReportItem"];
                        "application/json": components["schemas"]["AttendanceReportPageOfParentAttendanceReportItem"];
                        "text/json": components["schemas"]["AttendanceReportPageOfParentAttendanceReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/parent/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfParentAssignmentReportItem"];
                        "application/json": components["schemas"]["ReportPageOfParentAssignmentReportItem"];
                        "text/json": components["schemas"]["ReportPageOfParentAssignmentReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/parent/exams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfParentExamReportItem"];
                        "application/json": components["schemas"]["ReportPageOfParentExamReportItem"];
                        "text/json": components["schemas"]["ReportPageOfParentExamReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/teacher/classes/{classId}/attendance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AttendanceReportPageOfTeacherAttendanceReportItem"];
                        "application/json": components["schemas"]["AttendanceReportPageOfTeacherAttendanceReportItem"];
                        "text/json": components["schemas"]["AttendanceReportPageOfTeacherAttendanceReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/teacher/classes/{classId}/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfTeacherAssignmentReportItem"];
                        "application/json": components["schemas"]["ReportPageOfTeacherAssignmentReportItem"];
                        "text/json": components["schemas"]["ReportPageOfTeacherAssignmentReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/teacher/classes/{classId}/exams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfTeacherExamReportItem"];
                        "application/json": components["schemas"]["ReportPageOfTeacherExamReportItem"];
                        "text/json": components["schemas"]["ReportPageOfTeacherExamReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/teacher/classes/{classId}/learners/{learnerId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                    learnerId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["TeacherLearnerOverviewDto"];
                        "application/json": components["schemas"]["TeacherLearnerOverviewDto"];
                        "text/json": components["schemas"]["TeacherLearnerOverviewDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/manager/enrollments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    CourseId?: string;
                    AcademicPeriodId?: string;
                    Status?: string;
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfManagerEnrollmentReportItem"];
                        "application/json": components["schemas"]["ReportPageOfManagerEnrollmentReportItem"];
                        "text/json": components["schemas"]["ReportPageOfManagerEnrollmentReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/manager/attendance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfManagerAttendanceReportItem"];
                        "application/json": components["schemas"]["ReportPageOfManagerAttendanceReportItem"];
                        "text/json": components["schemas"]["ReportPageOfManagerAttendanceReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/manager/assessments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    CourseId?: string;
                    AcademicPeriodId?: string;
                    Kind?: string;
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfManagerAssessmentReportItem"];
                        "application/json": components["schemas"]["ReportPageOfManagerAssessmentReportItem"];
                        "text/json": components["schemas"]["ReportPageOfManagerAssessmentReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/manager/classes/{classId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ManagerClassPerformanceDto"];
                        "application/json": components["schemas"]["ManagerClassPerformanceDto"];
                        "text/json": components["schemas"]["ManagerClassPerformanceDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/manager/teacher-workload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    CourseId?: string;
                    AcademicPeriodId?: string;
                    PageNumber?: number;
                    PageSize?: number;
                    FromUtc?: string;
                    ToUtc?: string;
                    ClassId?: string;
                    Sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ReportPageOfManagerTeacherWorkloadReportItem"];
                        "application/json": components["schemas"]["ReportPageOfManagerTeacherWorkloadReportItem"];
                        "text/json": components["schemas"]["ReportPageOfManagerTeacherWorkloadReportItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/schedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description بازهٔ fromUtc و toUtc اجباری است؛ هر دو UTC با پسوند Z، پایان پس از آغاز و حداکثر یک سال پس از آغاز. حذف یا بازهٔ نامعتبر: 400 SESSION_TIME_INVALID. مجوزهای فعلی تقویم حفظ می‌شوند. */
        get: {
            parameters: {
                query: {
                    /**
                     * @description زمان UTC اجباری با پسوند Z
                     * @example 2026-11-01T00:00:00Z
                     */
                    fromUtc: string;
                    /**
                     * @description زمان UTC اجباری با پسوند Z
                     * @example 2026-11-08T00:00:00Z
                     */
                    toUtc: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SessionResult"][];
                        "application/json": components["schemas"]["SessionResult"][];
                        "text/json": components["schemas"]["SessionResult"][];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SESSION_TIME_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/schedule-rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateScheduleRuleCommand"];
                    "text/json": components["schemas"]["CreateScheduleRuleCommand"];
                    "application/*+json": components["schemas"]["CreateScheduleRuleCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ScheduleRuleResult"];
                        "application/json": components["schemas"]["ScheduleRuleResult"];
                        "text/json": components["schemas"]["ScheduleRuleResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/schedule-rules/{scheduleRuleId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    scheduleRuleId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateScheduleRuleCommand"];
                    "text/json": components["schemas"]["UpdateScheduleRuleCommand"];
                    "application/*+json": components["schemas"]["UpdateScheduleRuleCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["ScheduleRuleResult"];
                        "application/json": components["schemas"]["ScheduleRuleResult"];
                        "text/json": components["schemas"]["ScheduleRuleResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/organization/people/{learnerId}/guardian-invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. فقط Manager جاری. یکی از username دقیق یا phoneNumber قابل نرمال‌سازی به حساب موجود و تلفن تأییدشده؛ هیچ fuzzy matching یا ایجاد حساب انجام نمی‌شود. انقضای UTC در آینده و حداکثر ۳۰ روز. خطای مقصد 404 بدون افشای هویت. دعوت در inbox مقصد و nextAction=CONFIRM_GUARDIAN_RELATION نمایش داده می‌شود؛ پذیرش صریح در endpoint موجود لازم است. Messaging privacy تغییر نمی‌کند. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    learnerId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "clientOperationId": "00000000-0000-0000-0000-000000000001",
                     *       "username": "test.parent",
                     *       "phoneNumber": null,
                     *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                     *       "reason": "تأیید رابطه والد"
                     *     }
                     */
                    "application/json": components["schemas"]["CreateSchoolGuardianInvitationCommand"];
                    /**
                     * @example {
                     *       "clientOperationId": "00000000-0000-0000-0000-000000000001",
                     *       "username": "test.parent",
                     *       "phoneNumber": null,
                     *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                     *       "reason": "تأیید رابطه والد"
                     *     }
                     */
                    "text/json": components["schemas"]["CreateSchoolGuardianInvitationCommand"];
                    /**
                     * @example {
                     *       "clientOperationId": "00000000-0000-0000-0000-000000000001",
                     *       "username": "test.parent",
                     *       "phoneNumber": null,
                     *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                     *       "reason": "تأیید رابطه والد"
                     *     }
                     */
                    "application/*+json": components["schemas"]["CreateSchoolGuardianInvitationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianInvitationResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000003",
                         *       "status": "Pending",
                         *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *       "version": "AAAAAAAAAAE=",
                         *       "replayed": false,
                         *       "nextAction": "AWAIT_PARENT_CONFIRMATION"
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolGuardianInvitationResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000003",
                         *       "status": "Pending",
                         *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *       "version": "AAAAAAAAAAE=",
                         *       "replayed": false,
                         *       "nextAction": "AWAIT_PARENT_CONFIRMATION"
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolGuardianInvitationResult"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianInvitationResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000003",
                         *       "status": "Pending",
                         *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *       "version": "AAAAAAAAAAE=",
                         *       "replayed": false,
                         *       "nextAction": "AWAIT_PARENT_CONFIRMATION"
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolGuardianInvitationResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000003",
                         *       "status": "Pending",
                         *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *       "version": "AAAAAAAAAAE=",
                         *       "replayed": false,
                         *       "nextAction": "AWAIT_PARENT_CONFIRMATION"
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolGuardianInvitationResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "GUARDIAN_INVITATION_TARGET_NOT_AVAILABLE",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 409,
                         *       "code": "GUARDIAN_INVITATION_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                412: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 412,
                         *       "code": "CONCURRENCY_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 429,
                         *       "code": "RATE_LIMITED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/guardian-invitations/{invitationId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description نشست معتبر و Workspace سازمانی جاری لازم است؛ OrganizationId ارسالی از کلاینت مجوز نیست. فقط Manager جاری. یکی از username دقیق یا phoneNumber قابل نرمال‌سازی به حساب موجود و تلفن تأییدشده؛ هیچ fuzzy matching یا ایجاد حساب انجام نمی‌شود. انقضای UTC در آینده و حداکثر ۳۰ روز. خطای مقصد 404 بدون افشای هویت. دعوت در inbox مقصد و nextAction=CONFIRM_GUARDIAN_RELATION نمایش داده می‌شود؛ پذیرش صریح در endpoint موجود لازم است. Messaging privacy تغییر نمی‌کند. فهرست‌ها items/totalCount/page/pageSize/dataAsOfUtc دارند؛ ترتیب پایدار با شناسهٔ یکتا به‌عنوان tie-breaker. status اختیاری و enum رشته‌ای؛ فیلدهای اختیاری null هستند. تغییر هم‌زمان داده بین صفحات snapshot واحد تضمین نمی‌کند. */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    invitationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "expectedRowVersion": "AAAAAAAAAAE=",
                     *       "reason": "لغو دعوت والد"
                     *     }
                     */
                    "application/json": components["schemas"]["OnboardingStateCommand"];
                    /**
                     * @example {
                     *       "expectedRowVersion": "AAAAAAAAAAE=",
                     *       "reason": "لغو دعوت والد"
                     *     }
                     */
                    "text/json": components["schemas"]["OnboardingStateCommand"];
                    /**
                     * @example {
                     *       "expectedRowVersion": "AAAAAAAAAAE=",
                     *       "reason": "لغو دعوت والد"
                     *     }
                     */
                    "application/*+json": components["schemas"]["OnboardingStateCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianInvitationResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000003",
                         *       "status": "Pending",
                         *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *       "version": "AAAAAAAAAAE=",
                         *       "replayed": false,
                         *       "nextAction": "AWAIT_PARENT_CONFIRMATION"
                         *     }
                         */
                        "application/json": components["schemas"]["SchoolGuardianInvitationResult"];
                        /**
                         * @example {
                         *       "id": "00000000-0000-0000-0000-000000000001",
                         *       "organizationId": "00000000-0000-0000-0000-000000000002",
                         *       "learnerOrganizationPersonId": "00000000-0000-0000-0000-000000000003",
                         *       "status": "Pending",
                         *       "expiresAtUtc": "2026-11-01T12:00:00Z",
                         *       "version": "AAAAAAAAAAE=",
                         *       "replayed": false,
                         *       "nextAction": "AWAIT_PARENT_CONFIRMATION"
                         *     }
                         */
                        "text/json": components["schemas"]["SchoolGuardianInvitationResult"];
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 400,
                         *       "code": "SCHOOL_REQUEST_INVALID",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 401,
                         *       "code": "AUTH_REQUIRED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 403,
                         *       "code": "WORKSPACE_NOT_ALLOWED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 404,
                         *       "code": "GUARDIAN_INVITATION_TARGET_NOT_AVAILABLE",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 409,
                         *       "code": "GUARDIAN_INVITATION_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                412: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 412,
                         *       "code": "CONCURRENCY_CONFLICT",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
                /** @description ProblemDetails؛ مجوز، وضعیت یا نسخهٔ معتبر لازم است. */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "status": 429,
                         *       "code": "RATE_LIMITED",
                         *       "correlationId": "example-correlation"
                         *     }
                         */
                        "application/problem+json": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/guardian-relations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    learnerId?: string;
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianRelationsPage"];
                        "application/json": components["schemas"]["SchoolGuardianRelationsPage"];
                        "text/json": components["schemas"]["SchoolGuardianRelationsPage"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateSchoolGuardianRelationCommand"];
                    "text/json": components["schemas"]["CreateSchoolGuardianRelationCommand"];
                    "application/*+json": components["schemas"]["CreateSchoolGuardianRelationCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianRelationDto"];
                        "application/json": components["schemas"]["SchoolGuardianRelationDto"];
                        "text/json": components["schemas"]["SchoolGuardianRelationDto"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianRelationDto"];
                        "application/json": components["schemas"]["SchoolGuardianRelationDto"];
                        "text/json": components["schemas"]["SchoolGuardianRelationDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/guardian-relations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianRelationDto"];
                        "application/json": components["schemas"]["SchoolGuardianRelationDto"];
                        "text/json": components["schemas"]["SchoolGuardianRelationDto"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/guardian-relations/{id}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["OnboardingStateCommand"];
                    "text/json": components["schemas"]["OnboardingStateCommand"];
                    "application/*+json": components["schemas"]["OnboardingStateCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianRelationDto"];
                        "application/json": components["schemas"]["SchoolGuardianRelationDto"];
                        "text/json": components["schemas"]["SchoolGuardianRelationDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/guardian-relations/{id}/end": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["OnboardingStateCommand"];
                    "text/json": components["schemas"]["OnboardingStateCommand"];
                    "application/*+json": components["schemas"]["OnboardingStateCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianRelationDto"];
                        "application/json": components["schemas"]["SchoolGuardianRelationDto"];
                        "text/json": components["schemas"]["SchoolGuardianRelationDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organization/guardian-relations/{id}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["OnboardingStateCommand"];
                    "text/json": components["schemas"]["OnboardingStateCommand"];
                    "application/*+json": components["schemas"]["OnboardingStateCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SchoolGuardianRelationDto"];
                        "application/json": components["schemas"]["SchoolGuardianRelationDto"];
                        "text/json": components["schemas"]["SchoolGuardianRelationDto"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/classes/{classId}/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    classId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateSessionCommand"];
                    "text/json": components["schemas"]["CreateSessionCommand"];
                    "application/*+json": components["schemas"]["CreateSessionCommand"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SessionResult"];
                        "application/json": components["schemas"]["SessionResult"];
                        "text/json": components["schemas"]["SessionResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/sessions/{sessionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SessionResult"];
                        "application/json": components["schemas"]["SessionResult"];
                        "text/json": components["schemas"]["SessionResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateSessionCommand"];
                    "text/json": components["schemas"]["UpdateSessionCommand"];
                    "application/*+json": components["schemas"]["UpdateSessionCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SessionResult"];
                        "application/json": components["schemas"]["SessionResult"];
                        "text/json": components["schemas"]["SessionResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/sessions/{sessionId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SessionVersionCommand"];
                    "text/json": components["schemas"]["SessionVersionCommand"];
                    "application/*+json": components["schemas"]["SessionVersionCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SessionResult"];
                        "application/json": components["schemas"]["SessionResult"];
                        "text/json": components["schemas"]["SessionResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/sessions/{sessionId}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SessionVersionCommand"];
                    "text/json": components["schemas"]["SessionVersionCommand"];
                    "application/*+json": components["schemas"]["SessionVersionCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SessionResult"];
                        "application/json": components["schemas"]["SessionResult"];
                        "text/json": components["schemas"]["SessionResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/sessions/{sessionId}/attendance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SessionAttendanceResult"];
                        "application/json": components["schemas"]["SessionAttendanceResult"];
                        "text/json": components["schemas"]["SessionAttendanceResult"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["RecordAttendanceCommand"];
                    "text/json": components["schemas"]["RecordAttendanceCommand"];
                    "application/*+json": components["schemas"]["RecordAttendanceCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AttendanceEntryResult"][];
                        "application/json": components["schemas"]["AttendanceEntryResult"][];
                        "text/json": components["schemas"]["AttendanceEntryResult"][];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/sessions/{sessionId}/attendance/{attendanceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    sessionId: string;
                    attendanceId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CorrectAttendanceCommand"];
                    "text/json": components["schemas"]["CorrectAttendanceCommand"];
                    "application/*+json": components["schemas"]["CorrectAttendanceCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AttendanceEntryResult"];
                        "application/json": components["schemas"]["AttendanceEntryResult"];
                        "text/json": components["schemas"]["AttendanceEntryResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/assignments/{assignmentId}/attempts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionAttemptResult"];
                        "application/json": components["schemas"]["SubmissionAttemptResult"];
                        "text/json": components["schemas"]["SubmissionAttemptResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/assignments/{assignmentId}/attempts/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionAttemptResult"][];
                        "application/json": components["schemas"]["SubmissionAttemptResult"][];
                        "text/json": components["schemas"]["SubmissionAttemptResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionAttemptResult"];
                        "application/json": components["schemas"]["SubmissionAttemptResult"];
                        "text/json": components["schemas"]["SubmissionAttemptResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SaveSubmissionDraftCommand"];
                    "text/json": components["schemas"]["SaveSubmissionDraftCommand"];
                    "application/*+json": components["schemas"]["SaveSubmissionDraftCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionAttemptResult"];
                        "application/json": components["schemas"]["SubmissionAttemptResult"];
                        "text/json": components["schemas"]["SubmissionAttemptResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AttachSubmissionFileCommand"];
                    "text/json": components["schemas"]["AttachSubmissionFileCommand"];
                    "application/*+json": components["schemas"]["AttachSubmissionFileCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionAttemptResult"];
                        "application/json": components["schemas"]["SubmissionAttemptResult"];
                        "text/json": components["schemas"]["SubmissionAttemptResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/attachments/{fileAssetId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: {
                    expectedRowVersion?: string;
                };
                header?: never;
                path: {
                    attemptId: string;
                    fileAssetId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionAttemptResult"];
                        "application/json": components["schemas"]["SubmissionAttemptResult"];
                        "text/json": components["schemas"]["SubmissionAttemptResult"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/submission-attempts/{attemptId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    attemptId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["FinalSubmitAssignmentCommand"];
                    "text/json": components["schemas"]["FinalSubmitAssignmentCommand"];
                    "application/*+json": components["schemas"]["FinalSubmitAssignmentCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionReceipt"];
                        "application/json": components["schemas"]["SubmissionReceipt"];
                        "text/json": components["schemas"]["SubmissionReceipt"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/academic/assignments/{assignmentId}/submitted-attempts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["SubmissionAttemptResult"][];
                        "application/json": components["schemas"]["SubmissionAttemptResult"][];
                        "text/json": components["schemas"]["SubmissionAttemptResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["WorkspaceResult"][];
                        "application/json": components["schemas"]["WorkspaceResult"][];
                        "text/json": components["schemas"]["WorkspaceResult"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces/select": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SelectWorkspaceCommand"];
                    "text/json": components["schemas"]["SelectWorkspaceCommand"];
                    "application/*+json": components["schemas"]["SelectWorkspaceCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AccessContext"];
                        "application/json": components["schemas"]["AccessContext"];
                        "text/json": components["schemas"]["AccessContext"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["AccessContext"];
                        "application/json": components["schemas"]["AccessContext"];
                        "text/json": components["schemas"]["AccessContext"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces/snapshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["WorkspaceSnapshotResult"];
                        "application/json": components["schemas"]["WorkspaceSnapshotResult"];
                        "text/json": components["schemas"]["WorkspaceSnapshotResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        CreateAcademicPeriodCommand: {
            title: string;
            /** Format: date */
            startDate: string;
            /** Format: date */
            endDate: string;
        };
        AcademicPeriodResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            title: string;
            /** Format: date */
            startDate: string;
            /** Format: date */
            endDate: string;
            status: components["schemas"]["AcademicPeriodStatus"];
        };
        /** @enum {string} */
        AcademicPeriodStatus: "Active" | "Closed";
        SchoolPageOfAcademicPeriodResult: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["AcademicPeriodResult"][];
        };
        AiRoleInsightResponse: {
            requestId: string;
            correlationId: string | null;
            summary: string;
            strengths: components["schemas"]["AiInsight"][];
            attentionAreas: unknown[];
            risks: unknown[];
            recommendations: components["schemas"]["AiRecommendation"][];
            sources: components["schemas"]["AiSourceReference"][];
            metadata: components["schemas"]["AiResponseMetadata"];
        };
        AiInsight: {
            type: string;
            severity: components["schemas"]["AiSeverity"];
            entityType: string | null;
            entityId: string | null;
            title: string | null;
            description: string | null;
            /** Format: double */
            confidence: number | null;
        };
        /** @enum {string} */
        AiSeverity: "Info" | "Low" | "Medium" | "High" | "Critical";
        AiRecommendation: {
            title: string;
            description: string | null;
        };
        AiSourceReference: {
            type: string;
            id: string;
        };
        AiResponseMetadata: {
            modelAlias: string;
            /** Format: int32 */
            processingTimeMs: number;
        };
        CreateAssignmentDraftCommand: {
            title: string;
            description: string;
            /** Format: date-time */
            dueAtUtc: string;
            allowLateSubmission: boolean;
            /** Format: int32 */
            maxAttempts: number;
            /** Format: double */
            maxScore: number;
        };
        AssignmentResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            status: components["schemas"]["AssignmentStatus"];
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: date-time */
            publishedAtUtc: string | null;
            /** Format: uuid */
            versionId: string;
            /** Format: int32 */
            versionNumber: number;
            title: string;
            description: string;
            /** Format: date-time */
            dueAtUtc: string;
            allowLateSubmission: boolean;
            /** Format: int32 */
            maxAttempts: number;
            /** Format: double */
            maxScore: number;
            assignmentRowVersion: string;
            versionRowVersion: string;
        };
        /** @enum {string} */
        AssignmentStatus: "Draft" | "Published" | "Closed" | "Archived";
        UpdateAssignmentDraftCommand: {
            title: string;
            description: string;
            /** Format: date-time */
            dueAtUtc: string;
            allowLateSubmission: boolean;
            /** Format: int32 */
            maxAttempts: number;
            /** Format: double */
            maxScore: number;
            expectedAssignmentRowVersion: string;
            expectedVersionRowVersion: string;
        };
        PublishAssignmentCommand: {
            expectedAssignmentRowVersion: string;
            expectedVersionRowVersion: string;
        };
        PublishAssignmentResult: {
            assignment: components["schemas"]["AssignmentResult"];
            /** Format: int32 */
            recipientCount: number;
        };
        RequestOtpCommand: {
            phoneNumber: string;
        };
        RequestOtpResult: {
            /** Format: uuid */
            challengeId: string;
            /** Format: date-time */
            expiresAtUtc: string;
            /** Format: date-time */
            resendAvailableAtUtc: string;
        };
        VerifyOtpCommand: {
            /** Format: uuid */
            challengeId: string;
            phoneNumber: string;
            code: string;
            /** @default null */
            deviceName: string | null;
        };
        VerifyOtpResult: {
            accessToken: string;
            tokenType: string;
            /** Format: date-time */
            expiresAtUtc: string;
            refreshToken: string;
            /** Format: date-time */
            refreshExpiresAtUtc: string;
            user: components["schemas"]["CurrentUserResult"];
        };
        CurrentUserResult: {
            /** Format: uuid */
            id: string;
            phoneNumber: string;
            isProfileComplete: boolean;
            firstName: string | null;
            lastName: string | null;
            displayName: string | null;
            username: string | null;
            /**
             * Format: date
             * @default null
             */
            dateOfBirth: string | null;
            profilePhoto?: components["schemas"]["ProfilePhotoResult"];
        };
        /** @default null */
        ProfilePhotoResult: {
            /** Format: uuid */
            fileAssetId: string;
            contentType: string;
            downloadUrl?: string | null;
        } | null;
        RefreshSessionCommand: {
            refreshToken: string;
        };
        RefreshSessionResult: {
            accessToken: string;
            tokenType: string;
            /** Format: date-time */
            expiresAtUtc: string;
            refreshToken: string;
            /** Format: date-time */
            refreshExpiresAtUtc: string;
        };
        UserSessionResult: {
            /** Format: uuid */
            id: string;
            deviceName: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            expiresAtUtc: string;
            /** Format: date-time */
            absoluteExpiresAtUtc: string;
            isCurrent: boolean;
        };
        SchoolPageOfClassLearnerResult: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ClassLearnerResult"][];
        };
        ClassLearnerResult: {
            /** Format: uuid */
            enrollmentId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            /** Format: uuid */
            personId: string;
            /** Format: uuid */
            userId: string | null;
            displayName: string;
            username: string | null;
            profilePhoto: components["schemas"]["ProfilePhotoResult2"];
            status: components["schemas"]["EnrollmentStatus"];
            /** Format: date-time */
            enrolledAtUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
            version: string;
        };
        ProfilePhotoResult2: {
            /** Format: uuid */
            fileAssetId: string;
            contentType: string;
            downloadUrl?: string | null;
        } | null;
        /** @enum {string} */
        EnrollmentStatus: "Active" | "Completed" | "Withdrawn";
        AssignTeacherCommand: {
            /** Format: uuid */
            teacherMembershipId: string;
        };
        TeacherAssignmentResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            /** Format: uuid */
            teacherMembershipId: string;
            status: components["schemas"]["TeacherAssignmentStatus"];
            /** Format: date-time */
            assignedAtUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
        };
        /** @enum {string} */
        TeacherAssignmentStatus: "Active" | "Ended";
        SchoolPageOfClassTeacherResult: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ClassTeacherResult"][];
        };
        ClassTeacherResult: {
            /** Format: uuid */
            teacherAssignmentId: string;
            /** Format: uuid */
            teacherMembershipId: string;
            /** Format: uuid */
            userId: string;
            /** Format: uuid */
            personId: string | null;
            displayName: string;
            username: string | null;
            profilePhoto: components["schemas"]["ProfilePhotoResult2"];
            status: components["schemas"]["TeacherAssignmentStatus"];
            /** Format: date-time */
            assignedAtUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
            version: string;
        };
        CreateClassCommand: {
            /** Format: uuid */
            academicPeriodId: string;
            /** Format: uuid */
            courseId: string;
            title: string;
            /** Format: int32 */
            capacity: number;
            activateImmediately: boolean;
        };
        ClassResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            academicPeriodId: string;
            academicPeriodTitle: string;
            /** Format: uuid */
            courseId: string;
            courseTitle: string;
            title: string;
            /** Format: int32 */
            capacity: number;
            status: components["schemas"]["ClassStatus"];
        };
        /** @enum {string} */
        ClassStatus: "Draft" | "Active" | "Completed" | "Archived";
        EnrollLearnerCommand: {
            /** Format: uuid */
            learnerOrganizationPersonId: string;
        };
        EnrollmentResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            status: components["schemas"]["EnrollmentStatus"];
            /** Format: date-time */
            enrolledAtUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
        };
        EndEnrollmentCommand: {
            finalStatus: components["schemas"]["EnrollmentStatus"];
        };
        SchoolPageOfClassLessonResult: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ClassLessonResult"][];
        };
        ClassLessonResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            /** Format: uuid */
            courseId: string;
            title: string;
            body: string;
            /** Format: int32 */
            displayOrder: number;
            status: components["schemas"]["LessonStatus"];
            /** Format: int32 */
            revisionNumber: number;
            version: string;
            /** Format: uuid */
            createdByUserId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            updatedAtUtc: string | null;
            /** Format: date-time */
            publishedAtUtc: string | null;
            attachments: components["schemas"]["LessonAttachmentResult"][];
            /** @default false */
            replayed: boolean;
        };
        /** @enum {string} */
        LessonStatus: "Draft" | "Published";
        LessonAttachmentResult: {
            /** Format: uuid */
            fileAssetId: string;
            fileName: string;
            contentType: string;
            /** Format: int64 */
            sizeBytes: number;
            status: components["schemas"]["FileAssetStatus"];
            isAvailable: boolean;
            downloadUrl: string | null;
        };
        /** @enum {string} */
        FileAssetStatus: "Pending" | "Ready" | "Rejected" | "Deleted";
        CreateClassLessonCommand: {
            /** Format: uuid */
            clientOperationId: string;
            title: string;
            body: string | null;
            /** Format: int32 */
            displayOrder: number;
            fileAssetIds: string[];
        };
        UpdateClassLessonCommand: {
            title: string;
            body: string | null;
            /** Format: int32 */
            displayOrder: number;
            fileAssetIds: string[];
            expectedVersion: string;
        };
        PublishClassLessonCommand: {
            expectedVersion: string;
        };
        ManagerCommerceSummaryDto: {
            /** Format: uuid */
            organizationId: string;
            state: components["schemas"]["CommerceSummaryState"];
            subscription: components["schemas"]["CommerceSubscriptionDto"];
            entitlements: components["schemas"]["CommerceEntitlementDto"][];
            quotas: components["schemas"]["CommerceQuotaDto"][];
            /** Format: date-time */
            dataAsOfUtc: string;
            commercialControlEnabled?: boolean;
            hasVerifiedCommercialContract?: boolean;
            migrationStatus?: components["schemas"]["CommercialMigrationStatus"];
            /** Format: date-time */
            commercialEnforcementFromUtc?: string | null;
        };
        /** @enum {string} */
        CommerceSummaryState: "NoSubscription" | "Active" | "Inactive";
        CommerceSubscriptionDto: {
            /** Format: uuid */
            subscriptionId: string;
            /** Format: uuid */
            planId: string;
            /** Format: uuid */
            planVersionId: string;
            planCode: string;
            planDisplayName: string;
            /** Format: int32 */
            planVersionNumber: number;
            status: components["schemas"]["SubscriptionStatus"];
            /** Format: date-time */
            startsAtUtc: string;
            /** Format: date-time */
            endsAtUtc: string | null;
        } | null;
        /** @enum {string} */
        SubscriptionStatus: "Pending" | "Active" | "Expired" | "Cancelled" | "Scheduled";
        CommerceEntitlementDto: {
            key: components["schemas"]["EntitlementKey"];
            enabled: boolean;
        };
        /** @enum {string} */
        EntitlementKey: "Academic" | "Assignments" | "Exams" | "Messaging" | "Reports" | "Storage" | "Ai" | "PersonalClassHosting" | "PersonalSources";
        CommerceQuotaDto: {
            key: components["schemas"]["QuotaKey"];
            /** Format: int64 */
            limit: number | null;
            /** Format: int64 */
            currentUsage: number;
            /** Format: int64 */
            remaining: number | null;
            isUnlimited: boolean;
            isOverQuota: boolean;
            usageSource: components["schemas"]["QuotaUsageSource"];
            /** Format: int64 */
            reserved?: number;
        };
        /** @enum {string} */
        QuotaKey: "ActiveLearners" | "ActiveClasses" | "StorageBytes" | "ReportExports" | "AiTextRequests" | "SourceCount" | "AssignmentFileBytes";
        /** @enum {string} */
        QuotaUsageSource: "AuthoritativeModule" | "UsageLedger";
        /** @enum {string} */
        CommercialMigrationStatus: "NotApplicable" | "AwaitingValidContract" | "Completed";
        CreateOrderCommand: {
            /** Format: uuid */
            planVersionId: string;
            /** Format: uuid */
            clientOperationId: string;
            purpose?: components["schemas"]["CommercialOrderPurpose"];
            /**
             * Format: uuid
             * @default null
             */
            subscriptionId: string | null;
        };
        /**
         * @default Purchase
         * @enum {string}
         */
        CommercialOrderPurpose: "Purchase" | "Renewal" | "Upgrade";
        CreateOrderResult: {
            order: components["schemas"]["OrderDto"];
            replayed: boolean;
        };
        OrderDto: {
            /** Format: uuid */
            orderId: string;
            /** Format: uuid */
            organizationId: string | null;
            /** Format: uuid */
            planVersionId: string;
            status: components["schemas"]["OrderStatus"];
            /** Format: double */
            amount: number;
            currency: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            paidAtUtc: string | null;
            fulfillmentState: components["schemas"]["OrderFulfillmentState"];
            paymentAttempts: components["schemas"]["PaymentAttemptDto"][];
            /** Format: double */
            priceToman?: number;
            displayCurrency?: string | null;
        };
        /** @enum {string} */
        OrderStatus: "PendingPayment" | "Paid" | "Cancelled";
        /** @enum {string} */
        OrderFulfillmentState: "NotStarted" | "SubscriptionActivationPending" | "SubscriptionActivated" | "ProvisioningPending";
        PaymentAttemptDto: {
            /** Format: uuid */
            paymentAttemptId: string;
            provider: string;
            status: components["schemas"]["PaymentAttemptStatus"];
            /** Format: double */
            amount: number;
            currency: string;
            providerReference: string | null;
            paymentUrl: string | null;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            completedAtUtc: string | null;
        };
        /** @enum {string} */
        PaymentAttemptStatus: "Created" | "Initiating" | "PendingVerification" | "Succeeded" | "Failed" | "Unknown";
        OrderListResult: {
            items: components["schemas"]["OrderListItemDto"][];
        };
        OrderListItemDto: {
            /** Format: uuid */
            orderId: string;
            /** Format: uuid */
            planVersionId: string;
            status: components["schemas"]["OrderStatus"];
            /** Format: double */
            amount: number;
            currency: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            paidAtUtc: string | null;
            fulfillmentState: components["schemas"]["OrderFulfillmentState"];
            latestPaymentStatus: components["schemas"]["NullableOfPaymentAttemptStatus"];
            /** Format: double */
            priceToman?: number;
            displayCurrency?: string | null;
        };
        /** @enum {string|null} */
        NullableOfPaymentAttemptStatus: "Created" | "Initiating" | "PendingVerification" | "Succeeded" | "Failed" | "Unknown" | null;
        InitiatePaymentCommand: {
            /** Format: uuid */
            clientOperationId: string;
        };
        InitiatePaymentResult: {
            order: components["schemas"]["OrderDto"];
            paymentAttempt: components["schemas"]["PaymentAttemptDto"];
            replayed: boolean;
        };
        CommercialQuoteDto: {
            purpose: components["schemas"]["CommercialOrderPurpose2"];
            /** Format: uuid */
            planVersionId: string;
            /** Format: uuid */
            subscriptionId: string | null;
            /** Format: double */
            priceToman: number;
            displayCurrency: string;
            /** Format: date-time */
            effectiveAtUtc: string;
            /** Format: date-time */
            periodEndsAtUtc: string;
            effectiveQuotas: components["schemas"]["CommercialQuotaDto"][];
            autoRenew: boolean;
            /** Format: date-time */
            expiresAtUtc?: string;
            previewOnly?: boolean;
            startsUponVerifiedPayment?: boolean;
        };
        /** @enum {string} */
        CommercialOrderPurpose2: "Purchase" | "Renewal" | "Upgrade";
        CommercialQuotaDto: {
            key: components["schemas"]["QuotaKey"];
            kind: components["schemas"]["QuotaKind"];
            unit: string;
            /** Format: int64 */
            limit: number | null;
            /** Format: int64 */
            consumed: number;
            /** Format: int64 */
            reserved: number;
            /** Format: int64 */
            remaining: number | null;
            isOverQuota: boolean;
            /** Format: int32 */
            warningPercent: number | null;
            /** Format: int32 */
            criticalWarningPercent?: number | null;
            isUsageAvailable?: boolean;
            isUnlimited?: boolean;
            warningLevel?: string | null;
        };
        /** @enum {string} */
        QuotaKind: "CurrentCapacity" | "PeriodicConsumption";
        /** @enum {string} */
        SubscriptionOwnerType: "Individual" | "Organization";
        CommercialPlanDto: {
            /** Format: uuid */
            planId: string;
            /** Format: uuid */
            planVersionId: string;
            code: string;
            displayName: string;
            audience: components["schemas"]["SubscriptionOwnerType"];
            /** Format: int32 */
            versionNumber: number;
            /** Format: double */
            priceToman: number;
            displayCurrency: string;
            calendar: components["schemas"]["BillingCalendar"];
            renewalMode: string;
            autoRenew: boolean;
            entitlements: {
                [key: string]: boolean;
            };
            quotas: {
                [key: string]: number | null;
            };
        };
        /** @enum {string} */
        BillingCalendar: "Gregorian" | "Persian";
        CommercialSummaryDto: {
            ownerType: components["schemas"]["SubscriptionOwnerType"];
            /** Format: uuid */
            ownerId: string;
            state: components["schemas"]["SubscriptionDisplayState"];
            commercialControlEnabled: boolean;
            /** Format: uuid */
            subscriptionId: string | null;
            /** Format: uuid */
            planVersionId: string | null;
            /** Format: date-time */
            periodStartsAtUtc: string | null;
            /** Format: date-time */
            periodEndsAtUtc: string | null;
            /** Format: date-time */
            graceEndsAtUtc: string | null;
            /** Format: uuid */
            scheduledPlanVersionId: string | null;
            entitlements: {
                [key: string]: boolean;
            };
            quotas: components["schemas"]["CommercialQuotaDto"][];
            /** Format: date-time */
            observedAtUtc: string;
            version?: string | null;
            migrationStatus?: components["schemas"]["CommercialMigrationStatus"];
            /** Format: uuid */
            legacySubscriptionId?: string | null;
            /** Format: date-time */
            commercialEnforcementFromUtc?: string | null;
            hasVerifiedCommercialContract?: boolean;
            planCode?: string | null;
            planDisplayName?: string | null;
            /** Format: int32 */
            planVersionNumber?: number | null;
            /** Format: double */
            monthlyPriceToman?: number | null;
            displayCurrency?: string | null;
            autoRenew?: boolean;
            renewalMode?: string | null;
            hasPendingPayment?: boolean;
            /** Format: uuid */
            renewalPlanVersionId?: string | null;
            /** Format: double */
            renewalPriceToman?: number | null;
        };
        /** @enum {string} */
        SubscriptionDisplayState: "NoSubscription" | "PendingPayment" | "Active" | "QuotaWarning" | "QuotaExceeded" | "GracePeriod" | "Expired" | "ScheduledDowngrade" | "LegacyPendingContract";
        AiQuotaPreflightCommand: {
            contextType: components["schemas"]["CommerceContextType"];
            /**
             * Format: uuid
             * @default null
             */
            contextId: string | null;
            payer?: components["schemas"]["NullableOfAiPayerSelection"];
        };
        /** @enum {string} */
        CommerceContextType: "Personal" | "PersonalClass" | "Organization";
        /**
         * @default null
         * @enum {string|null}
         */
        NullableOfAiPayerSelection: "Individual" | "Organization" | "FreeTrial" | null;
        AiQuotaPreflightDto: {
            payer: components["schemas"]["AiPayerSelection"];
            ownerType: components["schemas"]["SubscriptionOwnerType"];
            /** Format: uuid */
            ownerId: string;
            unit: string;
            /** Format: int64 */
            amount: number;
            /** Format: int64 */
            remaining: number | null;
            /** Format: date-time */
            periodEndsAtUtc: string | null;
            allowed: boolean;
            errorCode: string | null;
            requiresExplicitSelection: boolean;
            /** @default false */
            authorizesEducationalData: boolean;
        };
        /** @enum {string} */
        AiPayerSelection: "Individual" | "Organization" | "FreeTrial";
        ScheduleDowngradeCommand: {
            /** Format: uuid */
            planVersionId: string;
            expectedVersion: string;
            reason: string;
        };
        MessagingStatusResult: {
            verificationStatus: components["schemas"]["CommunicationAgeVerificationStatus"];
            effectiveAgeCategory: components["schemas"]["CommunicationAgeCategory"];
            allowedActions: components["schemas"]["PersonalMessagingAction"][];
            nextAction: components["schemas"]["MessagingNextAction"];
            version: string;
        };
        /** @enum {string} */
        CommunicationAgeVerificationStatus: "Unverified" | "Verified" | "Conflict";
        /** @enum {string} */
        CommunicationAgeCategory: "Unknown" | "Minor" | "Adult";
        /** @enum {string} */
        PersonalMessagingAction: "ReadExistingConversations" | "DiscoverUsers" | "CreateDirect" | "CreatePersonalGroup" | "CreatePersonalChannel" | "DiscoverRelatedUsers" | "CreateDirectWithAuthorizedRelationship" | "CreatePrivatePersonalGroup";
        /** @enum {string} */
        MessagingNextAction: "None" | "VerificationRequired" | "ProfileCompletionRequired" | "VerificationConflictResolutionRequired" | "MessagingRestrictionActive" | "SelectPersonalWorkspace";
        CommunicationAgeResult: {
            /** Format: uuid */
            userId: string;
            classification: components["schemas"]["CommunicationAgeCategory"];
            verificationStatus: components["schemas"]["CommunicationAgeVerificationStatus"];
            version: string;
        };
        VerifyCommunicationAgeCommand: {
            /** Format: date */
            verifiedBirthDate: string;
            expectedVersion: string;
            reason: string;
        };
        UserContactPageResult: {
            items: components["schemas"]["UserContactResult"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            hasMore: boolean;
        };
        UserContactResult: {
            /** Format: uuid */
            contactUserId: string;
            savedName: string | null;
            isFavorite: boolean;
            profile: components["schemas"]["MessagingPublicProfileResult"];
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            updatedAtUtc: string;
            version: string;
            /** @default false */
            alreadyExisted: boolean;
        };
        MessagingPublicProfileResult: {
            /** Format: uuid */
            userId: string;
            username: string;
            displayName: string;
            phoneNumber: string | null;
            isSavedContact: boolean;
            isFavorite: boolean;
            canStartDirect: boolean;
            profilePhoto?: components["schemas"]["ProfilePhotoResult"];
        };
        SaveUserContactCommand: {
            /** Format: uuid */
            contactUserId: string;
            savedName: string | null;
        };
        RecentContactPageResult: {
            items: components["schemas"]["RecentContactResult"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            hasMore: boolean;
        };
        RecentContactResult: {
            profile: components["schemas"]["MessagingPublicProfileResult"];
            /** Format: date-time */
            lastActivityAtUtc: string;
        };
        UpdateUserContactCommand: {
            savedName: string | null;
            isFavorite: boolean;
            expectedVersion: string;
        };
        MemberRestrictionResult: {
            /** Format: uuid */
            conversationId: string;
            /** Format: uuid */
            userId: string;
            isBanned: boolean;
            deniedCapabilities: components["schemas"]["GroupMemberCapability"];
            /** Format: date-time */
            untilUtc: string | null;
            isEffective: boolean;
            version: string | null;
        };
        GroupMemberCapability: string;
        ConversationPeerReadStateResult: {
            /** Format: uuid */
            conversationId: string;
            /** Format: int64 */
            peerReadThroughSequence: number | null;
            visibility: components["schemas"]["PeerReadVisibility"];
            version: string | null;
        };
        /** @enum {string} */
        PeerReadVisibility: "Visible" | "Hidden" | "NotSupported";
        ProblemDetails: {
            type?: string | null;
            title?: string | null;
            /** Format: int32 */
            status?: number | null;
            detail?: string | null;
            instance?: string | null;
        };
        CreateManagedConversationCommand: {
            /** Format: uuid */
            clientOperationId: string;
            scope: components["schemas"]["ConversationScope"];
            title: string;
            description: string | null;
            initialParticipantUserIds: string[] | null;
            visibility?: components["schemas"]["ConversationVisibility2"];
            groupHistoryPolicy?: components["schemas"]["GroupHistoryPolicy2"];
            memberCapabilities?: components["schemas"]["NullableOfGroupMemberCapability"];
        };
        /** @enum {string} */
        ConversationScope: "Personal" | "Organization";
        /**
         * @default Private
         * @enum {string}
         */
        ConversationVisibility2: "Private" | "Public";
        /**
         * @default FullHistory
         * @enum {string}
         */
        GroupHistoryPolicy2: "FullHistory" | "FromJoin";
        /** @default null */
        NullableOfGroupMemberCapability: string | null;
        ManagedConversationResult: {
            /** Format: uuid */
            conversationId: string;
            type: components["schemas"]["ConversationType"];
            scope: components["schemas"]["ConversationScope"];
            /** Format: uuid */
            organizationId: string | null;
            title: string;
            description: string | null;
            managementPolicy: components["schemas"]["ConversationManagementPolicy"];
            visibility: components["schemas"]["ConversationVisibility"];
            groupHistoryPolicy: components["schemas"]["GroupHistoryPolicy"];
            memberCapabilities: components["schemas"]["GroupMemberCapability"];
            status: components["schemas"]["ConversationStatus"];
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            archivedAtUtc: string | null;
            version: string;
            participants: components["schemas"]["ConversationParticipantResult"][];
            alreadyExisted: boolean;
        };
        /** @enum {string} */
        ConversationType: "Direct" | "Group" | "Channel" | "Saved";
        /** @enum {string} */
        ConversationManagementPolicy: "None" | "UserManaged" | "SystemManagedAcademic";
        /** @enum {string} */
        ConversationVisibility: "Private" | "Public";
        /** @enum {string} */
        GroupHistoryPolicy: "FullHistory" | "FromJoin";
        /** @enum {string} */
        ConversationStatus: "Active" | "Archived";
        ConversationParticipantResult: {
            /** Format: uuid */
            participantId: string;
            user: components["schemas"]["SafeMessagingIdentityResult"];
            role: components["schemas"]["ConversationParticipantRole"];
            status: components["schemas"]["ConversationParticipantStatus"];
            /** Format: date-time */
            joinedAtUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
            /** Format: int64 */
            historyVisibleFromSequence: number;
            adminPermissions: components["schemas"]["ConversationAdminPermission"];
            version: string;
        };
        SafeMessagingIdentityResult: {
            /** Format: uuid */
            userId: string;
            username: string;
            displayName: string;
            profilePhoto?: components["schemas"]["ProfilePhotoResult"];
        };
        /** @enum {string} */
        ConversationParticipantRole: "Owner" | "Admin" | "Member";
        /** @enum {string} */
        ConversationParticipantStatus: "Active" | "Removed" | "Left";
        ConversationAdminPermission: string;
        StartDirectConversationCommand: {
            /** Format: uuid */
            targetUserId: string;
            scope: components["schemas"]["ConversationScope"];
        };
        DirectConversationResult: {
            /** Format: uuid */
            conversationId: string;
            type: components["schemas"]["ConversationType"];
            scope: components["schemas"]["ConversationScope"];
            /** Format: uuid */
            organizationId: string | null;
            otherParticipant: components["schemas"]["SafeMessagingIdentityResult"];
            /** Format: date-time */
            createdAtUtc: string;
            alreadyExisted: boolean;
        };
        /**
         * @default All
         * @enum {string}
         */
        ConversationListFilter: "All" | "Direct" | "Group" | "Channel" | "Unread" | "Archived" | "Saved";
        ConversationSummaryResult: {
            /** Format: uuid */
            conversationId: string;
            type: components["schemas"]["ConversationType"];
            scope: components["schemas"]["ConversationScope"];
            /** Format: uuid */
            organizationId: string | null;
            title: string | null;
            otherParticipant: components["schemas"]["SafeMessagingIdentityResult2"];
            lastMessagePreview: string | null;
            /** Format: date-time */
            lastMessageAtUtc: string | null;
            /** Format: int64 */
            lastMessageSequence: number | null;
            /** Format: int64 */
            lastDeliveredMessageSequence: number;
            /** Format: int64 */
            lastReadMessageSequence: number;
            /** Format: int32 */
            unreadCount: number;
            /** Format: int32 */
            unreadMentionCount: number;
            isArchived: boolean;
            isMuted: boolean;
            muteMode: components["schemas"]["ConversationMuteMode"];
            /** Format: date-time */
            mutedUntilUtc: string | null;
            isPinned: boolean;
            isManuallyUnread: boolean;
            organization: components["schemas"]["ConversationOrganizationBadgeResult"];
            official?: components["schemas"]["OfficialSpaceMetadata"];
            isOfficial?: boolean;
        };
        SafeMessagingIdentityResult2: {
            /** Format: uuid */
            userId: string;
            username: string;
            displayName: string;
            profilePhoto?: components["schemas"]["ProfilePhotoResult"];
        } | null;
        /** @enum {string} */
        ConversationMuteMode: "None" | "Permanent" | "Until";
        ConversationOrganizationBadgeResult: {
            /** Format: uuid */
            organizationId: string;
            organizationName: string;
        } | null;
        OfficialSpaceMetadata: {
            sourceKind: components["schemas"]["OfficialSourceKind"];
            /** Format: uuid */
            sourceId: string;
            /** Format: uuid */
            organizationId: string;
            purpose: components["schemas"]["ConversationType"];
            displayLabel: string;
            version: string;
        } | null;
        /** @enum {string} */
        OfficialSourceKind: "Organization" | "Class";
        ConversationMessagePageResult: {
            messages: components["schemas"]["ConversationMessageResult"][];
            /** Format: int64 */
            nextBeforeSequence: number | null;
        };
        ConversationMessageResult: {
            /** Format: uuid */
            messageId: string;
            /** Format: uuid */
            conversationId: string;
            /** Format: uuid */
            senderUserId: string;
            sender: components["schemas"]["SafeMessagingIdentityResult"];
            /** Format: uuid */
            clientMessageId: string;
            /** Format: int64 */
            sequence: number;
            kind: components["schemas"]["NullableOfMessageKind"];
            text: string | null;
            /** Format: date-time */
            sentAtUtc: string;
            /** Format: date-time */
            editedAtUtc: string | null;
            /** Format: date-time */
            deletedAtUtc: string | null;
            isEdited: boolean;
            isDeleted: boolean;
            reply: components["schemas"]["MessageReplySummaryResult"];
            isForwarded: boolean;
            reactions: components["schemas"]["MessageReactionSummaryResult"][];
            mentions: components["schemas"]["SafeMessagingIdentityResult"][];
            attachments: components["schemas"]["MessageAttachmentResult"][];
            contactCard: components["schemas"]["ContactCardResult"];
            isPinned: boolean;
            version: string;
            /**
             * Format: uuid
             * @default null
             */
            topicId: string | null;
            /** @default false */
            isSilent: boolean;
            originKind?: string;
            academicActivity?: components["schemas"]["AcademicActivityCardResult"];
        };
        /** @enum {string|null} */
        NullableOfMessageKind: "Text" | "Image" | "Video" | "Voice" | "File" | "ContactCard" | "Poll" | "Checklist" | null;
        MessageReplySummaryResult: {
            /** Format: uuid */
            messageId: string;
            /** Format: uuid */
            senderUserId: string | null;
            kind: components["schemas"]["NullableOfMessageKind"];
            text: string | null;
            isDeleted: boolean;
            isUnavailable: boolean;
        } | null;
        MessageReactionSummaryResult: {
            reaction: components["schemas"]["MessageReactionType"];
            /** Format: int32 */
            count: number;
            reactedByCurrentUser: boolean;
        };
        /** @enum {string} */
        MessageReactionType: "Like" | "Love" | "Laugh" | "Wow" | "Sad";
        MessageAttachmentResult: {
            /** Format: uuid */
            fileAssetId: string;
            kind: components["schemas"]["MessageKind"];
            fileName: string;
            contentType: string;
            /** Format: int64 */
            sizeBytes: number;
            /** Format: date-time */
            createdAtUtc: string;
        };
        /** @enum {string} */
        MessageKind: "Text" | "Image" | "Video" | "Voice" | "File" | "ContactCard" | "Poll" | "Checklist";
        ContactCardResult: {
            /** Format: uuid */
            userId: string;
            username: string;
            displayName: string;
        } | null;
        AcademicActivityCardResult: {
            /** Format: uuid */
            eventId: string;
            kind: components["schemas"]["AcademicActivityKind"];
            /** Format: uuid */
            sourceId: string;
            /** Format: uuid */
            sourceVersionId: string;
            /** Format: int32 */
            sourceRevision: number;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            /** Format: uuid */
            destinationConversationId: string;
            destinationPurpose: components["schemas"]["ConversationType"];
            actorKind: string;
            /** Format: uuid */
            initiatedByUserId: string;
            /** Format: date-time */
            occurredAtUtc: string;
            title: string;
            /** Format: date-time */
            dueAtUtc: string | null;
            /** Format: date-time */
            availableFromUtc: string | null;
            /** Format: date-time */
            availableUntilUtc: string | null;
            state: string;
            isActionable: boolean;
        } | null;
        /** @enum {string} */
        AcademicActivityKind: "Lesson" | "Assignment" | "Exam";
        SendMessageCommand: {
            /** Format: uuid */
            clientMessageId?: string;
            kind?: components["schemas"]["MessageKind"];
            text?: string | null;
            attachmentIds?: string[] | null;
            /** Format: uuid */
            replyToMessageId?: string | null;
            mentionedUserIds?: string[] | null;
            /** Format: uuid */
            contactUserId?: string | null;
            /** Format: uuid */
            topicId?: string | null;
            isSilent?: boolean;
        };
        MessageReceiptResult: {
            /** Format: uuid */
            messageId: string;
            /** Format: uuid */
            conversationId: string;
            /** Format: uuid */
            clientMessageId: string;
            /** Format: int64 */
            sequence: number;
            kind: components["schemas"]["MessageKind"];
            /** Format: date-time */
            sentAtUtc: string;
            status: components["schemas"]["MessageReceiptStatus"];
            version: string;
        };
        /** @enum {string} */
        MessageReceiptStatus: "Sent";
        ConversationMediaPageResult: {
            items: components["schemas"]["ConversationMediaItemResult"][];
            /** Format: int64 */
            nextBeforeSequence: number | null;
        };
        ConversationMediaItemResult: {
            /** Format: uuid */
            messageId: string;
            /** Format: int64 */
            sequence: number;
            /** Format: uuid */
            senderUserId: string;
            /** Format: date-time */
            sentAtUtc: string;
            attachment: components["schemas"]["MessageAttachmentResult"];
        };
        AdvanceConversationCursorCommand: {
            /** Format: int64 */
            upToMessageSequence: number;
        };
        ConversationCursorStateResult: {
            /** Format: uuid */
            conversationId: string;
            /** Format: int64 */
            lastDeliveredMessageSequence: number;
            /** Format: int64 */
            lastReadMessageSequence: number;
            /** Format: int32 */
            unreadCount: number;
            /** Format: date-time */
            updatedAtUtc: string | null;
            version: string;
        };
        ConversationParticipantPageResult: {
            items: components["schemas"]["ConversationParticipantResult"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            hasMore: boolean;
        };
        UpdateConversationSettingsCommand: {
            visibility: components["schemas"]["ConversationVisibility"];
            groupHistoryPolicy: components["schemas"]["GroupHistoryPolicy"];
            memberCapabilities: components["schemas"]["GroupMemberCapability"];
            expectedVersion: string;
        };
        ConversationUserStateResult: {
            /** Format: uuid */
            conversationId: string;
            isArchived: boolean;
            isMuted: boolean;
            muteMode: components["schemas"]["ConversationMuteMode"];
            /** Format: date-time */
            mutedUntilUtc: string | null;
            isPinned: boolean;
            isManuallyUnread: boolean;
            /** Format: int64 */
            historyHiddenThroughSequence: number;
            /** Format: date-time */
            updatedAtUtc: string;
            version: string;
        };
        CreateCourseCommand: {
            title: string;
        };
        CourseResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            title: string;
            status: components["schemas"]["CourseStatus"];
        };
        /** @enum {string} */
        CourseStatus: "Active" | "Archived";
        SchoolPageOfCourseResult: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["CourseResult"][];
        };
        StudentDashboardDto: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: uuid */
            organizationId: string;
            audience: components["schemas"]["DashboardAudience"];
            nextSession: components["schemas"]["DashboardSessionItem"];
            nearestAssignmentDeadline: components["schemas"]["DashboardAssignmentItem"];
            recentReleasedFeedback: components["schemas"]["StudentReleasedAssignmentItem"][];
            upcomingExams: components["schemas"]["DashboardExamItem"][];
            attendanceSummary: components["schemas"]["DashboardAttendanceSummary"];
            /** Format: int32 */
            pendingAssignmentCount: number;
        };
        /** @enum {string} */
        DashboardAudience: "Student" | "Parent" | "Teacher" | "Manager";
        DashboardSessionItem: {
            /** Format: uuid */
            sessionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            timeZoneId: string;
            meetingUrl: string | null;
            status: components["schemas"]["SessionStatus"];
        } | null;
        /** @enum {string} */
        SessionStatus: "Scheduled" | "Cancelled" | "Completed";
        DashboardAssignmentItem: {
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: date-time */
            dueAtUtc: string;
            allowLateSubmission: boolean;
            status: components["schemas"]["StudentAssignmentActionStatus"];
        } | null;
        /** @enum {string} */
        StudentAssignmentActionStatus: "NotStarted" | "Draft" | "Submitted" | "SubmittedLate" | "Graded";
        StudentReleasedAssignmentItem: {
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            assignmentId: string;
            assignmentTitle: string;
            /** Format: double */
            score: number;
            /** Format: double */
            maximumScore: number;
            learnerFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string;
        };
        DashboardExamItem: {
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: date-time */
            availableFromUtc: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: int32 */
            durationMinutes: number;
            latestAttemptStatus: components["schemas"]["NullableOfExamAttemptStatus"];
            resultReleaseStatus: components["schemas"]["NullableOfExamResultReleaseStatus"];
            /** Format: double */
            releasedScore: number | null;
            /** Format: double */
            maximumScore: number | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
        };
        /** @enum {string|null} */
        NullableOfExamAttemptStatus: "InProgress" | "Expired" | "Finalized" | null;
        /** @enum {string|null} */
        NullableOfExamResultReleaseStatus: "AwaitingGrading" | "AwaitingRelease" | "Released" | null;
        DashboardAttendanceSummary: {
            /** Format: int32 */
            eligibleSessionCount: number;
            /** Format: int32 */
            recordedCount: number;
            /** Format: int32 */
            presentCount: number;
            /** Format: int32 */
            absentCount: number;
            /** Format: int32 */
            lateCount: number;
            /** Format: int32 */
            excusedCount: number;
            /** Format: int32 */
            notRecordedCount: number;
        };
        ParentDashboardDto: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: uuid */
            organizationId: string;
            audience: components["schemas"]["DashboardAudience"];
            selectedLearner: components["schemas"]["DashboardLearner"];
            upcomingSessions: components["schemas"]["DashboardSessionItem2"][];
            assignments: components["schemas"]["DashboardAssignmentItem2"][];
            releasedAssignmentResults: components["schemas"]["ParentReleasedAssignmentItem"][];
            exams: components["schemas"]["DashboardExamItem"][];
            attendanceSummary: components["schemas"]["DashboardAttendanceSummary"];
            /** Format: int32 */
            attentionItemCount: number;
        };
        DashboardLearner: {
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            displayName: string;
        } | null;
        DashboardSessionItem2: {
            /** Format: uuid */
            sessionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            timeZoneId: string;
            meetingUrl: string | null;
            status: components["schemas"]["SessionStatus"];
        };
        DashboardAssignmentItem2: {
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: date-time */
            dueAtUtc: string;
            allowLateSubmission: boolean;
            status: components["schemas"]["StudentAssignmentActionStatus"];
        };
        ParentReleasedAssignmentItem: {
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            assignmentId: string;
            assignmentTitle: string;
            /** Format: double */
            score: number;
            /** Format: double */
            maximumScore: number;
            guardianVisibleFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string;
        };
        TeacherDashboardDto: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: uuid */
            organizationId: string;
            audience: components["schemas"]["DashboardAudience"];
            assignedClasses: components["schemas"]["DashboardClassItem"][];
            upcomingSessions: components["schemas"]["DashboardSessionItem2"][];
            attendancePending: components["schemas"]["DashboardAttendancePendingItem"][];
            assignmentGradingQueue: components["schemas"]["AssignmentGradingQueueSummary"];
            examGradingQueue: components["schemas"]["ExamGradingQueueSummary"];
        };
        DashboardClassItem: {
            /** Format: uuid */
            classId: string;
            classTitle: string;
            courseTitle: string;
            academicPeriodTitle: string;
            /** Format: int32 */
            activeLearnerCount: number;
        };
        DashboardAttendancePendingItem: {
            /** Format: uuid */
            sessionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            sessionTitle: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            /** Format: int32 */
            expectedEnrollmentCount: number;
            /** Format: int32 */
            recordedCount: number;
            /** Format: int32 */
            missingCount: number;
        };
        AssignmentGradingQueueSummary: {
            /** Format: int32 */
            awaitingEvaluationCount: number;
            /** Format: int32 */
            draftEvaluationCount: number;
            /** Format: int32 */
            totalPendingCount: number;
        };
        ExamGradingQueueSummary: {
            /** Format: int32 */
            awaitingGradingCount: number;
            /** Format: int32 */
            manualReviewCount: number;
            /** Format: int32 */
            readyForReleaseCount: number;
            /** Format: int32 */
            totalPendingCount: number;
        };
        ManagerDashboardDto: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: uuid */
            organizationId: string;
            audience: components["schemas"]["DashboardAudience"];
            operationalCounts: components["schemas"]["ManagerOperationalCounts"];
            onboarding: components["schemas"]["ManagerOnboardingChecklist"];
            upcomingSessions: components["schemas"]["DashboardSessionItem2"][];
            sessionsMissingMeetingLink: unknown[];
            attendancePending: components["schemas"]["DashboardAttendancePendingItem"][];
            /** Format: int32 */
            pendingInvitationCount: number;
            assignmentGradingQueue: components["schemas"]["AssignmentGradingQueueSummary"];
            examGradingQueue: components["schemas"]["ExamGradingQueueSummary"];
        };
        ManagerOperationalCounts: {
            /** Format: int32 */
            activeClassCount: number;
            /** Format: int32 */
            enrolledLearnerCount: number;
            /** Format: int32 */
            teacherCount: number;
        };
        ManagerOnboardingChecklist: {
            organizationBasicDataAvailable: boolean;
            hasAcademicPeriod: boolean;
            hasCourse: boolean;
            hasTeacher: boolean;
            hasLearner: boolean;
            hasClass: boolean;
        };
        EvaluationQueueItemResult: {
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: uuid */
            classId: string;
            assignmentTitle: string;
            studentDisplayName: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            submittedAtUtc: string;
            isLate: boolean;
            /** Format: double */
            maxScore: number;
            reviewStatus: components["schemas"]["EvaluationReviewStatus"];
            /** Format: int32 */
            evaluationRevisionNumber: number | null;
            /** Format: double */
            score: number | null;
        };
        /** @enum {string} */
        EvaluationReviewStatus: "AwaitingEvaluation" | "Draft" | "Released" | "CorrectionDraft";
        SubmissionForEvaluationResult: {
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: uuid */
            classId: string;
            assignmentTitle: string;
            studentDisplayName: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            submittedAtUtc: string;
            isLate: boolean;
            /** Format: double */
            maxScore: number;
            answerText: string | null;
            attachments: components["schemas"]["SubmissionAttachmentResult"][];
        };
        SubmissionAttachmentResult: {
            /** Format: uuid */
            fileAssetId: string;
            originalFileName: string;
            contentType: string;
            /** Format: int64 */
            sizeBytes: number;
            fileStatus: components["schemas"]["FileAssetStatus"];
            /** Format: date-time */
            attachedAtUtc: string;
        };
        EvaluatorEvaluationResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: int32 */
            revisionNumber: number;
            /** Format: double */
            score: number;
            /** Format: double */
            maxScore: number;
            learnerFeedback: string | null;
            guardianVisibleFeedback: string | null;
            teacherPrivateNote: string | null;
            status: components["schemas"]["EvaluationRevisionStatus"];
            /** Format: uuid */
            createdByMembershipId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: uuid */
            supersedesEvaluationRevisionId: string | null;
            correctionReason: string | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
            rowVersion: string;
        };
        /** @enum {string} */
        EvaluationRevisionStatus: "Draft" | "Released" | "Superseded";
        SaveEvaluationDraftCommand: {
            /** Format: double */
            score: number;
            learnerFeedback: string | null;
            guardianVisibleFeedback: string | null;
            teacherPrivateNote: string | null;
            expectedRowVersion: string | null;
        };
        ReleaseEvaluationCommand: {
            expectedRowVersion: string;
        };
        GradeReleaseResult: {
            /** Format: uuid */
            gradeReleaseId: string;
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            evaluationRevisionId: string;
            /** Format: int32 */
            revisionNumber: number;
            /** Format: double */
            score: number;
            /** Format: date-time */
            releasedAtUtc: string;
            /** Format: uuid */
            releasedByMembershipId: string;
            evaluationRowVersion: string;
        };
        CorrectReleasedEvaluationCommand: {
            /** Format: double */
            score: number;
            learnerFeedback: string | null;
            guardianVisibleFeedback: string | null;
            teacherPrivateNote: string | null;
            correctionReason: string;
            expectedReleasedEvaluationRowVersion: string;
        };
        StudentReleasedResult: {
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: int32 */
            evaluationRevisionNumber: number;
            /** Format: double */
            score: number;
            /** Format: double */
            maxScore: number;
            learnerFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string;
        };
        ParentReleasedResult: {
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: int32 */
            evaluationRevisionNumber: number;
            /** Format: double */
            score: number;
            /** Format: double */
            maxScore: number;
            guardianVisibleFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string;
        };
        ExamGradingQueueItemDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: uuid */
            classId: string;
            examTitle: string;
            studentDisplayName: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            finalizedAtUtc: string;
            /** Format: double */
            maximumScore: number;
            status: components["schemas"]["ExamGradingQueueStatus"];
            /** Format: int32 */
            gradeRevisionNumber: number | null;
            requiresManualReview: boolean;
        };
        /** @enum {string} */
        ExamGradingQueueStatus: "AwaitingGrading" | "Draft" | "ReadyForRelease" | "Released" | "CorrectionDraft";
        ExamGradeDto: {
            /** Format: uuid */
            examGradeRevisionId: string;
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: uuid */
            classId: string;
            examTitle: string;
            studentDisplayName: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            finalizedAtUtc: string;
            /** Format: int32 */
            revisionNumber: number;
            /** Format: double */
            totalScore: number;
            /** Format: double */
            maximumScore: number;
            status: components["schemas"]["ExamGradeRevisionStatus"];
            learnerFeedback: string | null;
            guardianVisibleFeedback: string | null;
            evaluatorPrivateNote: string | null;
            /** Format: uuid */
            createdByMembershipId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            updatedAtUtc: string;
            /** Format: uuid */
            supersedesExamGradeRevisionId: string | null;
            correctionReason: string | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
            rowVersion: string;
            questions: components["schemas"]["ExamQuestionGradeDto"][];
        };
        /** @enum {string} */
        ExamGradeRevisionStatus: "Draft" | "ReadyForRelease" | "Released" | "Superseded";
        ExamQuestionGradeDto: {
            /** Format: uuid */
            examAttemptQuestionId: string;
            /** Format: uuid */
            questionVersionId: string;
            /** Format: int32 */
            displayOrder: number;
            questionType: components["schemas"]["ExamQuestionType"];
            prompt: string;
            isAnswered: boolean;
            selectedOptionText: string | null;
            textAnswer: string | null;
            /** Format: double */
            awardedScore: number;
            /** Format: double */
            maximumScore: number;
            gradingMode: components["schemas"]["ExamQuestionGradingMode"];
            isReviewed: boolean;
            learnerFeedback: string | null;
            evaluatorPrivateNote: string | null;
            /** Format: uuid */
            reviewedByMembershipId: string | null;
            /** Format: date-time */
            reviewedAtUtc: string | null;
            attachments?: components["schemas"]["AcademicAnswerAttachmentDto"][];
        };
        /** @enum {string} */
        ExamQuestionType: "ObjectiveSingleChoice" | "Descriptive";
        /** @enum {string} */
        ExamQuestionGradingMode: "Objective" | "Manual";
        AcademicAnswerAttachmentDto: {
            /** Format: uuid */
            fileAssetId: string;
            originalFileName: string;
            contentType: string;
            /** Format: int64 */
            sizeBytes: number;
            fileStatus: components["schemas"]["FileAssetStatus"];
            canDownload: boolean;
            downloadPath: string | null;
        };
        GradeExamQuestionCommand: {
            /** Format: double */
            awardedScore: number;
            learnerFeedback: string | null;
            evaluatorPrivateNote: string | null;
            expectedGradeRowVersion: string;
        };
        CompleteExamGradeCommand: {
            learnerFeedback: string | null;
            guardianVisibleFeedback: string | null;
            evaluatorPrivateNote: string | null;
            expectedGradeRowVersion: string;
        };
        ReleaseExamGradeCommand: {
            /** Format: uuid */
            clientOperationId: string;
            expectedGradeRowVersion: string;
        };
        ExamGradeReleaseDto: {
            /** Format: uuid */
            examGradeReleaseId: string;
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examGradeRevisionId: string;
            /** Format: int32 */
            gradeRevisionNumber: number;
            /** Format: double */
            totalScore: number;
            /** Format: double */
            maximumScore: number;
            /** Format: date-time */
            releasedAtUtc: string;
            /** Format: uuid */
            releasedByMembershipId: string;
            gradeRowVersion: string;
        };
        CorrectReleasedExamGradeCommand: {
            correctionReason: string;
            expectedReleasedGradeRowVersion: string;
        };
        StudentExamResultDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            finalizedAtUtc: string;
            releaseStatus: components["schemas"]["ExamResultReleaseStatus"];
            /** Format: int32 */
            gradeRevisionNumber: number | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
            /** Format: double */
            score: number | null;
            /** Format: double */
            maximumScore: number | null;
            learnerFeedback: string | null;
        };
        /** @enum {string} */
        ExamResultReleaseStatus: "AwaitingGrading" | "AwaitingRelease" | "Released";
        GuardianExamResultDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            finalizedAtUtc: string;
            releaseStatus: components["schemas"]["ExamResultReleaseStatus"];
            /** Format: int32 */
            gradeRevisionNumber: number | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
            /** Format: double */
            score: number | null;
            /** Format: double */
            maximumScore: number | null;
            guardianVisibleFeedback: string | null;
        };
        CreateExamDraftCommand: {
            title: string;
            description: string | null;
            /** Format: date-time */
            availableFromUtc: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: int32 */
            durationMinutes: number;
            /** Format: int32 */
            maxAttempts: number;
            /** Format: double */
            maxScore: number;
            randomizationPolicy: components["schemas"]["ExamRandomizationPolicy"];
        };
        /** @enum {string} */
        ExamRandomizationPolicy: "None" | "QuestionOrder";
        ExamEditorDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            status: components["schemas"]["ExamStatus"];
            /** Format: date-time */
            createdAtUtc: string;
            examRowVersion: string;
            /** Format: uuid */
            versionId: string;
            /** Format: int32 */
            versionNumber: number;
            versionStatus: components["schemas"]["ExamVersionStatus"];
            title: string;
            description: string | null;
            /** Format: date-time */
            availableFromUtc: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: int32 */
            durationMinutes: number;
            /** Format: int32 */
            maxAttempts: number;
            /** Format: double */
            maxScore: number;
            randomizationPolicy: components["schemas"]["ExamRandomizationPolicy"];
            /** Format: date-time */
            publishedAtUtc: string | null;
            versionRowVersion: string;
            questions: components["schemas"]["ExamEditorQuestionDto"][];
        };
        /** @enum {string} */
        ExamStatus: "Draft" | "Published";
        /** @enum {string} */
        ExamVersionStatus: "Draft" | "Published";
        ExamEditorQuestionDto: {
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            order: number;
            type: components["schemas"]["ExamQuestionType"];
            prompt: string;
            /** Format: double */
            score: number;
            options: components["schemas"]["ExamEditorOptionDto"][];
            rowVersion: string;
            attachmentPolicy?: components["schemas"]["ExamQuestionAttachmentPolicyDto"];
        };
        ExamEditorOptionDto: {
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            order: number;
            text: string;
            isCorrect: boolean;
        };
        ExamQuestionAttachmentPolicyDto: {
            attachmentsAllowed: boolean;
            textRequired: boolean;
            allowedContentTypes: string[];
            /** Format: int32 */
            maximumCount: number | null;
            /** Format: int64 */
            maximumTotalBytes: number | null;
        } | null;
        StudentExamSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            versionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            /** Format: int32 */
            versionNumber: number;
            title: string;
            description: string | null;
            publicationState: components["schemas"]["ExamVersionStatus"];
            rules: components["schemas"]["StudentExamRules"];
        };
        StudentExamRules: {
            /** Format: date-time */
            availableFromUtc: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: int32 */
            durationMinutes: number;
            /** Format: int32 */
            maxAttempts: number;
            /** Format: double */
            maxScore: number;
            randomizationPolicy: components["schemas"]["ExamRandomizationPolicy"];
        };
        ExamTeacherPreview: {
            exam: components["schemas"]["StudentExamSummary"];
            questions: components["schemas"]["ExamEditorQuestionDto"][];
        };
        UpdateExamDraftCommand: {
            title: string;
            description: string | null;
            /** Format: date-time */
            availableFromUtc: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: int32 */
            durationMinutes: number;
            /** Format: int32 */
            maxAttempts: number;
            /** Format: double */
            maxScore: number;
            randomizationPolicy: components["schemas"]["ExamRandomizationPolicy"];
            expectedVersionRowVersion: string;
        };
        AddExamQuestionCommand: {
            /** Format: int32 */
            order: number;
            type: components["schemas"]["ExamQuestionType"];
            prompt: string;
            /** Format: double */
            score: number;
            options: components["schemas"]["ExamQuestionOptionCommand"][] | null;
            expectedVersionRowVersion: string;
            attachmentPolicy?: components["schemas"]["ExamQuestionAttachmentPolicyCommand"];
        };
        ExamQuestionOptionCommand: {
            /** Format: int32 */
            order: number;
            text: string;
            isCorrect: boolean;
        };
        /** @default null */
        ExamQuestionAttachmentPolicyCommand: {
            attachmentsAllowed: boolean;
            textRequired: boolean;
            allowedContentTypes: string[] | null;
            /** Format: int32 */
            maximumCount: number | null;
            /** Format: int64 */
            maximumTotalBytes: number | null;
        } | null;
        UpdateExamQuestionCommand: {
            /** Format: int32 */
            order: number;
            type: components["schemas"]["ExamQuestionType"];
            prompt: string;
            /** Format: double */
            score: number;
            options: components["schemas"]["ExamQuestionOptionCommand"][] | null;
            expectedVersionRowVersion: string;
            expectedQuestionRowVersion: string;
            attachmentPolicy?: components["schemas"]["ExamQuestionAttachmentPolicyCommand"];
        };
        DeleteExamQuestionCommand: {
            expectedVersionRowVersion: string;
            expectedQuestionRowVersion: string;
        };
        StudentSafeExamPreview: {
            exam: components["schemas"]["StudentExamSummary"];
            questions: components["schemas"]["StudentSafeExamQuestion"][];
        };
        StudentSafeExamQuestion: {
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            order: number;
            type: components["schemas"]["ExamQuestionType"];
            prompt: string;
            /** Format: double */
            score: number;
            options: components["schemas"]["StudentSafeExamOption"][];
            attachmentPolicy?: components["schemas"]["ExamQuestionAttachmentPolicyDto"];
        };
        StudentSafeExamOption: {
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            order: number;
            text: string;
        };
        PublishExamCommand: {
            expectedExamRowVersion: string;
            expectedVersionRowVersion: string;
        };
        CreateNextExamVersionCommand: {
            expectedExamRowVersion: string;
            expectedPublishedVersionRowVersion: string;
        };
        StartExamCommand: {
            /** Format: uuid */
            clientOperationId: string;
        };
        StudentExamAttemptDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            startedAtUtc: string;
            /** Format: date-time */
            effectiveDeadlineUtc: string;
            /** Format: date-time */
            serverNowUtc: string;
            status: components["schemas"]["ExamAttemptStatus"];
            questions: components["schemas"]["StudentExamAttemptQuestionDto"][];
        };
        /** @enum {string} */
        ExamAttemptStatus: "InProgress" | "Expired" | "Finalized";
        StudentExamAttemptQuestionDto: {
            /** Format: uuid */
            attemptQuestionId: string;
            /** Format: uuid */
            questionVersionId: string;
            /** Format: int32 */
            displayOrder: number;
            questionType: components["schemas"]["ExamQuestionType"];
            prompt: string;
            /** Format: double */
            score: number;
            options: components["schemas"]["StudentExamAttemptOptionDto"][];
            attachmentPolicy?: components["schemas"]["ExamQuestionAttachmentPolicyDto"];
        };
        StudentExamAttemptOptionDto: {
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            order: number;
            text: string;
        };
        StudentExamAttemptSummaryDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            startedAtUtc: string;
            /** Format: date-time */
            effectiveDeadlineUtc: string;
            /** Format: date-time */
            serverNowUtc: string;
            status: components["schemas"]["ExamAttemptStatus"];
        };
        ExamWriteLeaseDto: {
            /** Format: uuid */
            examAttemptId: string;
            isCurrentSessionWriter: boolean;
            /** Format: int64 */
            writeLeaseVersion: number;
            canRequestTransfer: boolean;
            /** Format: date-time */
            acquiredAtUtc: string | null;
            /** Format: int64 */
            answerSetVersion: number;
            /** Format: date-time */
            serverNowUtc: string;
        };
        SaveExamAnswerCommand: {
            /** Format: uuid */
            clientOperationId: string;
            /** Format: int64 */
            writeLeaseVersion: number;
            /** Format: int32 */
            expectedRevisionNumber: number | null;
            /** Format: uuid */
            selectedOptionId: string | null;
            textAnswer: string | null;
        };
        ExamAnswerReceiptDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examAttemptQuestionId: string;
            /** Format: uuid */
            answerRevisionId: string;
            /** Format: int32 */
            revisionNumber: number;
            /** Format: date-time */
            acceptedAtUtc: string;
            /** Format: int64 */
            writeLeaseVersion: number;
            /** Format: int64 */
            answerSetVersion: number;
            status: string;
        };
        AttachExamAnswerFileCommand: {
            /** Format: uuid */
            fileAssetId: string;
            /** Format: uuid */
            clientOperationId: string;
            /** Format: int64 */
            writeLeaseVersion: number;
            /** Format: int32 */
            expectedRevisionNumber: number | null;
        };
        StudentExamAnswersDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: int64 */
            answerSetVersion: number;
            writeLease: components["schemas"]["ExamWriteLeaseDto"];
            answers: components["schemas"]["StudentCurrentExamAnswerDto"][];
        };
        StudentCurrentExamAnswerDto: {
            /** Format: uuid */
            examAttemptQuestionId: string;
            /** Format: uuid */
            questionVersionId: string;
            /** Format: uuid */
            answerRevisionId: string;
            /** Format: int32 */
            revisionNumber: number;
            answerType: components["schemas"]["ExamQuestionType"];
            /** Format: uuid */
            selectedOptionId: string | null;
            textAnswer: string | null;
            /** Format: date-time */
            acceptedAtUtc: string;
            attachments?: components["schemas"]["AcademicAnswerAttachmentDto"][];
        };
        FinalizeExamCommand: {
            /** Format: uuid */
            clientOperationId: string;
            /** Format: int64 */
            expectedAnswerSetVersion: number;
            /** Format: int64 */
            writeLeaseVersion: number;
        };
        ExamFinalReceiptDto: {
            /** Format: uuid */
            examAttemptId: string;
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            startedAtUtc: string;
            /** Format: date-time */
            finalizedAtUtc: string;
            /** Format: int64 */
            finalizedAnswerSetVersion: number;
            /** Format: int32 */
            answeredQuestionCount: number;
            /** Format: int32 */
            totalQuestionCount: number;
            status: components["schemas"]["ExamAttemptStatus"];
        };
        /** Format: binary */
        IFormFile: string;
        FileAssetResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string | null;
            /** Format: uuid */
            uploadedByUserId: string;
            originalFileName: string;
            contentType: string;
            /** Format: int64 */
            sizeBytes: number;
            sha256Hash: string | null;
            status: components["schemas"]["FileAssetStatus"];
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            completedAtUtc: string | null;
            /** Format: date-time */
            deletedAtUtc: string | null;
            /** Format: date-time */
            retainedAtUtc: string | null;
            /** Format: date-time */
            unattachedExpiresAtUtc: string;
            rowVersion: string;
        };
        AuthorizedChildResult: {
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            displayName: string;
            /** Format: uuid */
            organizationId: string;
            organizationName: string;
            relationStatus: components["schemas"]["GuardianRelationStatus"];
        };
        /** @enum {string} */
        GuardianRelationStatus: "Pending" | "Active" | "Ended" | "Revoked";
        AccessContext: {
            /** Format: uuid */
            actorId: string;
            /** Format: uuid */
            userId: string;
            /** Format: uuid */
            sessionId: string;
            workspaceType: components["schemas"]["WorkspaceType"];
            /** Format: uuid */
            organizationId: string | null;
            /** Format: uuid */
            membershipId: string | null;
            activeRole: components["schemas"]["NullableOfOrganizationRole"];
            /** Format: uuid */
            subjectOrganizationPersonId: string | null;
        };
        /** @enum {string} */
        WorkspaceType: "Personal" | "Organization";
        /** @enum {string|null} */
        NullableOfOrganizationRole: "Student" | "Teacher" | "Parent" | "Manager" | null;
        GuardianRelationSummaryResult: {
            /** Format: uuid */
            relationId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            displayName: string;
            /** Format: uuid */
            organizationId: string;
            organizationName: string;
            status: components["schemas"]["GuardianRelationStatus"];
            /** Format: date-time */
            validFromUtc: string;
            /** Format: date-time */
            createdAtUtc: string;
        };
        InvitationResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            organizationName: string;
            /** Format: uuid */
            invitedByUserId: string;
            role: components["schemas"]["OrganizationRole"];
            status: components["schemas"]["InvitationStatus"];
            /** Format: date-time */
            expiresAtUtc: string;
            /**
             * Format: uuid
             * @default null
             */
            organizationPersonId: string | null;
            /** @default null */
            organizationPersonDisplayName: string | null;
            /**
             * Format: uuid
             * @default null
             */
            guardianLearnerOrganizationPersonId: string | null;
            /** @default null */
            guardianLearnerDisplayName: string | null;
            requiresPersonLinkConsent?: boolean;
            requiresGuardianConsent?: boolean;
            nextAction?: string | null;
        };
        /** @enum {string} */
        OrganizationRole: "Student" | "Teacher" | "Parent" | "Manager";
        /** @enum {string} */
        InvitationStatus: "Pending" | "Accepted" | "Declined" | "Expired" | "Revoked";
        AcceptInvitationCommand: {
            /** @default false */
            confirmPersonLink: boolean;
            /** @default false */
            confirmGuardianRelation: boolean;
        } | null;
        AcceptInvitationResult: {
            /** Format: uuid */
            invitationId: string;
            /** Format: uuid */
            organizationId: string;
            organizationName: string;
            /** Format: uuid */
            membershipId: string;
            /** Format: uuid */
            roleAssignmentId: string;
            role: components["schemas"]["OrganizationRole"];
            alreadyAccepted: boolean;
            /**
             * Format: uuid
             * @default null
             */
            organizationPersonId: string | null;
            /**
             * Format: uuid
             * @default null
             */
            guardianRelationId: string | null;
        };
        DeclineInvitationResult: {
            /** Format: uuid */
            invitationId: string;
            status: components["schemas"]["InvitationStatus"];
        };
        MessagingPrivacySettingsResult: {
            directMessagesAudience: components["schemas"]["PrivacyAudience"];
            phoneNumberVisibilityAudience: components["schemas"]["PrivacyAudience"];
            phoneNumberDiscoveryAudience: components["schemas"]["PrivacyAudience"];
            groupInvitesAudience: components["schemas"]["PrivacyAudience"];
            isExplicit: boolean;
            version: string | null;
            onlineAudience?: components["schemas"]["PrivacyAudience2"];
            lastSeenAudience?: components["schemas"]["PrivacyAudience2"];
        };
        /** @enum {string} */
        PrivacyAudience: "Everyone" | "Contacts" | "Nobody";
        /**
         * @default Contacts
         * @enum {string}
         */
        PrivacyAudience2: "Everyone" | "Contacts" | "Nobody";
        UpdateMessagingPrivacyCommand: {
            directMessagesAudience: components["schemas"]["PrivacyAudience"];
            phoneNumberVisibilityAudience: components["schemas"]["PrivacyAudience"];
            phoneNumberDiscoveryAudience: components["schemas"]["PrivacyAudience"];
            groupInvitesAudience: components["schemas"]["PrivacyAudience"];
            expectedVersion: string | null;
            onlineAudience?: components["schemas"]["NullableOfPrivacyAudience"];
            lastSeenAudience?: components["schemas"]["NullableOfPrivacyAudience"];
        };
        /**
         * @default null
         * @enum {string|null}
         */
        NullableOfPrivacyAudience: "Everyone" | "Contacts" | "Nobody" | null;
        UserBlockResult: {
            /** Format: uuid */
            blockId: string;
            blockedUser: components["schemas"]["SafeMessagingIdentityResult"];
            status: components["schemas"]["UserBlockStatus"];
            /** Format: date-time */
            createdAtUtc: string;
            alreadyExisted: boolean;
            version: string;
        };
        /** @enum {string} */
        UserBlockStatus: "Active" | "Ended";
        BlockedUserResult: {
            /** Format: uuid */
            blockId: string;
            user: components["schemas"]["SafeMessagingIdentityResult"];
            /** Format: date-time */
            createdAtUtc: string;
            version: string;
        };
        NotificationPreferenceItem: {
            scope: components["schemas"]["NotificationPreferenceScope"];
            /** Format: uuid */
            organizationId: string | null;
            category: components["schemas"]["NotificationPreferenceCategory"];
            inAppEnabled: boolean;
            pushEnabled: boolean;
            smsEnabled: boolean;
            isMandatory: boolean;
            canDisablePush: boolean;
            canDisableSms: boolean;
            quietHoursEnabled: boolean;
            /** Format: time */
            quietHoursStartLocal: string | null;
            /** Format: time */
            quietHoursEndLocal: string | null;
            timeZoneId: string | null;
            isExplicit: boolean;
            /** Format: date-time */
            updatedAtUtc: string | null;
            rowVersion: string | null;
        };
        /** @enum {string} */
        NotificationPreferenceScope: "Personal" | "Organization";
        /** @enum {string} */
        NotificationPreferenceCategory: "Messages" | "Assignments" | "Results" | "Sessions" | "Reports" | "Invitations" | "AccountSecurity";
        UpdateNotificationPreferenceCommand: {
            pushEnabled: boolean;
            smsEnabled: boolean;
            quietHoursEnabled: boolean;
            /** Format: time */
            quietHoursStartLocal: string | null;
            /** Format: time */
            quietHoursEndLocal: string | null;
            timeZoneId: string | null;
            expectedRowVersion: string | null;
        };
        NotificationPage: {
            items: components["schemas"]["NotificationItem"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
        };
        NotificationItem: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string | null;
            category: components["schemas"]["NotificationCategory"];
            type: components["schemas"]["NotificationType"];
            title: string;
            body: string;
            resourceType: components["schemas"]["NotificationResourceType"];
            /** Format: uuid */
            resourceId: string;
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            readAtUtc: string | null;
        };
        /** @enum {string} */
        NotificationCategory: "Educational" | "Communication" | "AccountSystem";
        /** @enum {string} */
        NotificationType: "AssignmentPublished" | "AssignmentGradeReleased" | "ExamPublished" | "ExamGradeReleased" | "MessageReceived" | "MessageReply" | "MessageMention";
        /** @enum {string} */
        NotificationResourceType: "Assignment" | "SubmissionAttempt" | "Exam" | "ExamAttempt" | "Conversation";
        OfficialSpacesPairResult: {
            sourceKind: components["schemas"]["OfficialSourceKind"];
            /** Format: uuid */
            sourceId: string;
            /** Format: uuid */
            organizationId: string;
            version: string;
            group: components["schemas"]["OfficialSpaceEndpointResult"];
            channel: components["schemas"]["OfficialSpaceEndpointResult"];
        };
        OfficialSpaceEndpointResult: {
            /** Format: uuid */
            conversationId: string | null;
            state: string;
            capabilities: components["schemas"]["OfficialSpaceCapabilities"];
            official: components["schemas"]["OfficialSpaceMetadata"];
            /** Format: int32 */
            attemptCount: number;
            lastFailureCategory: string | null;
        };
        OfficialSpaceCapabilities: {
            canRead: boolean;
            canSend: boolean;
            canManage: boolean;
        };
        AcademicActivityDeliveryResult: {
            /** Format: uuid */
            eventId: string;
            purpose: components["schemas"]["ConversationType"];
            state: components["schemas"]["AcademicActivityDeliveryState"];
            /** Format: uuid */
            conversationId: string | null;
            /** Format: uuid */
            messageId: string | null;
            /** Format: int32 */
            attemptCount: number;
            lastFailureCategory: string | null;
        };
        /** @enum {string} */
        AcademicActivityDeliveryState: "Pending" | "Delivered" | "Superseded";
        SchoolPageOfSchoolMemberResult: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["SchoolMemberResult"][];
        };
        SchoolMemberResult: {
            /** Format: uuid */
            userId: string;
            /** Format: uuid */
            personId: string | null;
            /** Format: uuid */
            organizationPersonId: string | null;
            displayName: string;
            username: string | null;
            profilePhoto: components["schemas"]["ProfilePhotoResult2"];
            /** Format: uuid */
            membershipId: string;
            membershipStatus: components["schemas"]["MembershipStatus"];
            activeRoles: components["schemas"]["OrganizationRole"][];
            roleAssignments: components["schemas"]["SchoolRoleAssignmentResult"][];
            version: string;
        };
        /** @enum {string} */
        MembershipStatus: "Active" | "Suspended" | "Ended";
        SchoolRoleAssignmentResult: {
            /** Format: uuid */
            roleAssignmentId: string;
            role: components["schemas"]["OrganizationRole"];
            status: components["schemas"]["RoleAssignmentStatus"];
            /** Format: date-time */
            assignedAtUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
            version: string;
        };
        /** @enum {string} */
        RoleAssignmentStatus: "Active" | "Ended";
        CreateOrganizationPersonCommand: {
            /** Format: uuid */
            clientOperationId: string;
            firstName: string;
            lastName: string;
            displayName: string | null;
            reason: string;
        };
        OrganizationPersonDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            personId: string;
            firstName: string;
            lastName: string;
            displayName: string | null;
            status: components["schemas"]["OrganizationPersonStatus"];
            isAccountLinked: boolean;
            canEditNames: boolean;
            rowVersion: string;
            personRowVersion: string;
            /** @default false */
            replayed: boolean;
        };
        /** @enum {string} */
        OrganizationPersonStatus: "Active" | "Ended";
        OrganizationPeoplePage: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["OrganizationPersonDto"][];
        };
        UpdateOrganizationPersonNamesCommand: {
            firstName: string;
            lastName: string;
            displayName: string | null;
            expectedRowVersion: string;
            expectedPersonRowVersion: string;
            reason: string;
        };
        OnboardingStateCommand: {
            expectedRowVersion: string;
            reason: string;
        };
        CreatePersonLinkInvitationCommand: {
            /** Format: uuid */
            clientOperationId: string;
            /** Format: uuid */
            destinationUserId: string;
            /** Format: date-time */
            expiresAtUtc: string;
            expectedRowVersion: string;
            reason: string;
        };
        PersonLinkInvitationDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationPersonId: string;
            /** Format: uuid */
            destinationUserId: string;
            role: components["schemas"]["OrganizationRole"];
            status: components["schemas"]["InvitationStatus"];
            /** Format: date-time */
            expiresAtUtc: string;
            rowVersion: string;
            /** @default false */
            replayed: boolean;
        };
        PeopleSearchPageResult: {
            items: components["schemas"]["MessagingPublicProfileResult"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            hasMore: boolean;
        };
        ResolvePersonCommand: {
            username: string | null;
            phoneNumber: string | null;
        };
        PeopleResolveResult: {
            isDiscoverable: boolean;
            profile: components["schemas"]["MessagingPublicProfileResult2"];
        };
        MessagingPublicProfileResult2: {
            /** Format: uuid */
            userId: string;
            username: string;
            displayName: string;
            phoneNumber: string | null;
            isSavedContact: boolean;
            isFavorite: boolean;
            canStartDirect: boolean;
            profilePhoto?: components["schemas"]["ProfilePhotoResult"];
        } | null;
        CreatePersonalClassCommand: {
            title: string;
            /** Format: uuid */
            clientOperationId: string;
        };
        PersonalClassDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            hostUserId: string;
            title: string;
            archived: boolean;
            isHost: boolean;
            canCreateEducationalContent: boolean;
            educationalWorkflowStatus: string;
            /** Format: date-time */
            createdAtUtc: string;
        };
        InvitePersonalClassStudentCommand: {
            /** Format: uuid */
            destinationUserId: string;
            /** Format: uuid */
            clientOperationId: string;
        };
        PersonalClassInvitationDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            personalClassId: string;
            /** Format: uuid */
            destinationUserId: string;
            /** Format: date-time */
            expiresAtUtc: string;
            accepted: boolean;
        };
        PersonalClassParticipantDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            studentUserId: string;
            /** Format: date-time */
            joinedAtUtc: string;
            active: boolean;
        };
        SetProfilePhotoCommand: {
            /** Format: uuid */
            fileAssetId: string;
        };
        ProfilePhotoResult3: {
            /** Format: uuid */
            fileAssetId: string;
            contentType: string;
            downloadUrl?: string | null;
        };
        CompleteProfileCommand: {
            firstName: string;
            lastName: string;
            displayName: string | null;
            username: string;
            /**
             * Format: date
             * @default null
             */
            dateOfBirth: string | null;
        };
        AccountChangePageResult: {
            changes: components["schemas"]["AccountChangeResult"][];
            nextCursor: string;
            hasMore: boolean;
            watermark: string;
            epoch: string;
            contextRevision: string;
            /**
             * Format: int32
             * @default null
             */
            retryAfterMilliseconds: number | null;
        };
        AccountChangeResult: {
            /** Format: uuid */
            eventId: string;
            streamVersion: string;
            conversation: components["schemas"]["MessagingRealtimeNotification"];
            invalidation: components["schemas"]["RealtimeInvalidation"];
        };
        MessagingRealtimeNotification: {
            /** Format: uuid */
            conversationId: string;
            type: components["schemas"]["MessagingChangeType"];
            /** Format: uuid */
            resourceId: string;
            resourceVersion: string | null;
            cursor: string;
            /** Format: date-time */
            occurredAtUtc: string;
            /** Format: int32 */
            payloadVersion: number;
            /**
             * Format: int64
             * @default null
             */
            peerReadThroughSequence: number | null;
            /** @default null */
            contextRevision: string | null;
        } | null;
        /** @enum {string} */
        MessagingChangeType: "MessageCreated" | "MessageEdited" | "MessageDeleted" | "ReactionChanged" | "PinChanged" | "ParticipantChanged" | "ConversationChanged" | "ReadCursorAdvanced" | "DeliveryCursorAdvanced" | "MessageHiddenForUser" | "ConversationUserStateChanged" | "PeerReadStateChanged" | "TopicChanged" | "PollChanged" | "ChecklistChanged";
        RealtimeInvalidation: {
            /** Format: uuid */
            eventId: string;
            key: string;
            /** Format: uuid */
            resourceId: string | null;
            contextRevision: string;
            streamVersion: string;
            /** Format: date-time */
            occurredAtUtc: string;
            /**
             * Format: int32
             * @default 1
             */
            payloadVersion: number;
            /** @default null */
            traceId: string | null;
        } | null;
        CreateReportExportCommand: {
            reportType: components["schemas"]["ReportExportType"];
            format: components["schemas"]["ReportExportFormat"];
            filters: components["schemas"]["ReportExportFilters"];
            /**
             * Format: uuid
             * @default null
             */
            clientOperationId: string | null;
        };
        /** @enum {string} */
        ReportExportType: "StudentAttendance" | "StudentAssignments" | "StudentExams" | "StudentGrades" | "ParentChildAttendance" | "ParentChildAssignments" | "ParentChildExams" | "TeacherClassAttendance" | "TeacherAssignmentGrading" | "TeacherExamGrading" | "ManagerEnrollments" | "ManagerAttendance" | "ManagerAssessments" | "ManagerTeacherWorkload";
        /** @enum {string} */
        ReportExportFormat: "Csv";
        ReportExportFilters: {
            /**
             * Format: date-time
             * @default null
             */
            fromUtc: string | null;
            /**
             * Format: date-time
             * @default null
             */
            toUtc: string | null;
            /**
             * Format: uuid
             * @default null
             */
            classId: string | null;
            /** @default null */
            sort: string | null;
            /**
             * Format: uuid
             * @default null
             */
            courseId: string | null;
            /**
             * Format: uuid
             * @default null
             */
            academicPeriodId: string | null;
            enrollmentStatus?: components["schemas"]["NullableOfEnrollmentStatus"];
            assessmentKind?: components["schemas"]["NullableOfReportExportAssessmentKind"];
        } | null;
        /**
         * @default null
         * @enum {string|null}
         */
        NullableOfEnrollmentStatus: "Active" | "Completed" | "Withdrawn" | null;
        /**
         * @default null
         * @enum {string|null}
         */
        NullableOfReportExportAssessmentKind: "Assignment" | "Exam" | null;
        ReportExportJobResult: {
            /** Format: uuid */
            jobId: string;
            reportType: components["schemas"]["ReportExportType"];
            format: components["schemas"]["ReportExportFormat"];
            status: components["schemas"]["ReportExportJobStatus"];
            /** Format: int32 */
            expectedRowCount: number;
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: date-time */
            requestedAtUtc: string;
            /** Format: date-time */
            startedAtUtc: string | null;
            /** Format: date-time */
            completedAtUtc: string | null;
            /** Format: date-time */
            failedAtUtc: string | null;
            downloadAvailable: boolean;
            failureCode: string | null;
        };
        /** @enum {string} */
        ReportExportJobStatus: "Queued" | "Processing" | "Completed" | "Failed";
        FileStreamResult: {
            fileStream?: components["schemas"]["Stream"];
            contentType?: string | null;
            fileDownloadName?: string | null;
            /** Format: date-time */
            lastModified?: string | null;
            entityTag?: components["schemas"]["EntityTagHeaderValue"];
            enableRangeProcessing?: boolean;
        };
        /** Format: binary */
        Stream: string;
        EntityTagHeaderValue: {
            tag?: components["schemas"]["StringSegment"];
            isWeak?: boolean;
        } | null;
        StringSegment: {
            buffer?: string | null;
            /** Format: int32 */
            offset?: number;
            /** Format: int32 */
            length?: number;
            value?: string | null;
            hasValue?: boolean;
        };
        AttendanceReportPageOfStudentAttendanceReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            summary: components["schemas"]["AttendanceReportSummary"];
            items: components["schemas"]["StudentAttendanceReportItem"][];
        };
        AttendanceReportSummary: {
            /** Format: int32 */
            eligibleCount: number;
            /** Format: int32 */
            recordedCount: number;
            /** Format: int32 */
            presentCount: number;
            /** Format: int32 */
            absentCount: number;
            /** Format: int32 */
            lateCount: number;
            /** Format: int32 */
            excusedCount: number;
            /** Format: int32 */
            notRecordedCount: number;
        };
        StudentAttendanceReportItem: {
            /** Format: uuid */
            sessionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            courseTitle: string;
            sessionTitle: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            status: components["schemas"]["AttendanceStatus"];
            /** Format: date-time */
            recordedAtUtc: string | null;
        };
        /** @enum {string} */
        AttendanceStatus: "NotRecorded" | "Present" | "Absent" | "Late" | "Excused";
        ReportPageOfStudentAssignmentReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["StudentAssignmentReportItem"][];
        };
        StudentAssignmentReportItem: {
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            assignmentStatus: components["schemas"]["AssignmentStatus"];
            /** Format: date-time */
            dueAtUtc: string;
            /** Format: double */
            maximumScore: number;
            submissionStatus: components["schemas"]["NullableOfSubmissionAttemptStatus"];
            /** Format: date-time */
            submittedAtUtc: string | null;
            isLate: boolean | null;
            /** Format: double */
            releasedScore: number | null;
            learnerFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
        };
        /** @enum {string|null} */
        NullableOfSubmissionAttemptStatus: "Draft" | "Submitted" | null;
        ReportPageOfStudentExamReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["StudentExamReportItem"][];
        };
        StudentExamReportItem: {
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: date-time */
            availableFromUtc: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: int32 */
            durationMinutes: number;
            /** Format: int32 */
            maximumAttempts: number;
            /** Format: double */
            maximumScore: number;
            /** Format: int32 */
            attemptCount: number;
            latestAttemptStatus: components["schemas"]["NullableOfExamAttemptStatus"];
            /** Format: date-time */
            latestStartedAtUtc: string | null;
            /** Format: date-time */
            latestFinalizedAtUtc: string | null;
            /** Format: double */
            releasedScore: number | null;
            learnerFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
        };
        ReportPageOfStudentReleasedGradeReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["StudentReleasedGradeReportItem"][];
        };
        StudentReleasedGradeReportItem: {
            kind: components["schemas"]["DetailedReportGradeKind"];
            /** Format: uuid */
            assessmentId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: double */
            score: number;
            /** Format: double */
            maximumScore: number;
            /** Format: double */
            percentage: number;
            /** Format: date-time */
            releasedAtUtc: string;
        };
        /** @enum {string} */
        DetailedReportGradeKind: "Assignment" | "Exam";
        AttendanceReportPageOfParentAttendanceReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            summary: components["schemas"]["AttendanceReportSummary"];
            items: components["schemas"]["ParentAttendanceReportItem"][];
        };
        ParentAttendanceReportItem: {
            /** Format: uuid */
            sessionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            courseTitle: string;
            sessionTitle: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            status: components["schemas"]["AttendanceStatus"];
            /** Format: date-time */
            recordedAtUtc: string | null;
        };
        ReportPageOfParentAssignmentReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ParentAssignmentReportItem"][];
        };
        ParentAssignmentReportItem: {
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            assignmentStatus: components["schemas"]["AssignmentStatus"];
            /** Format: date-time */
            dueAtUtc: string;
            /** Format: double */
            maximumScore: number;
            submissionStatus: components["schemas"]["NullableOfSubmissionAttemptStatus"];
            /** Format: date-time */
            submittedAtUtc: string | null;
            isLate: boolean | null;
            /** Format: double */
            releasedScore: number | null;
            guardianVisibleFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
        };
        ReportPageOfParentExamReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ParentExamReportItem"][];
        };
        ParentExamReportItem: {
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            title: string;
            /** Format: date-time */
            availableFromUtc: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: int32 */
            durationMinutes: number;
            /** Format: double */
            maximumScore: number;
            /** Format: int32 */
            attemptCount: number;
            latestAttemptStatus: components["schemas"]["NullableOfExamAttemptStatus"];
            /** Format: date-time */
            latestFinalizedAtUtc: string | null;
            /** Format: double */
            releasedScore: number | null;
            guardianVisibleFeedback: string | null;
            /** Format: date-time */
            releasedAtUtc: string | null;
        };
        AttendanceReportPageOfTeacherAttendanceReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            summary: components["schemas"]["AttendanceReportSummary"];
            items: components["schemas"]["TeacherAttendanceReportItem"][];
        };
        TeacherAttendanceReportItem: {
            /** Format: uuid */
            sessionId: string;
            sessionTitle: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            /** Format: uuid */
            enrollmentId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            learnerDisplayName: string;
            status: components["schemas"]["AttendanceStatus"];
            /** Format: date-time */
            recordedAtUtc: string | null;
        };
        ReportPageOfTeacherAssignmentReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["TeacherAssignmentReportItem"][];
        };
        TeacherAssignmentReportItem: {
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            title: string;
            /** Format: date-time */
            dueAtUtc: string;
            /** Format: double */
            maximumScore: number;
            /** Format: uuid */
            enrollmentId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            learnerDisplayName: string;
            /** Format: uuid */
            submissionAttemptId: string | null;
            submissionStatus: components["schemas"]["NullableOfSubmissionAttemptStatus"];
            /** Format: date-time */
            submittedAtUtc: string | null;
            isLate: boolean | null;
            /** Format: double */
            currentScore: number | null;
            evaluationStatus: components["schemas"]["NullableOfEvaluationRevisionStatus"];
            isReleased: boolean;
        };
        /** @enum {string|null} */
        NullableOfEvaluationRevisionStatus: "Draft" | "Released" | "Superseded" | null;
        ReportPageOfTeacherExamReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["TeacherExamReportItem"][];
        };
        TeacherExamReportItem: {
            /** Format: uuid */
            examId: string;
            /** Format: uuid */
            examVersionId: string;
            title: string;
            /** Format: date-time */
            availableUntilUtc: string;
            /** Format: double */
            maximumScore: number;
            /** Format: uuid */
            enrollmentId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            learnerDisplayName: string;
            /** Format: uuid */
            examAttemptId: string | null;
            attemptStatus: components["schemas"]["NullableOfExamAttemptStatus"];
            /** Format: date-time */
            finalizedAtUtc: string | null;
            /** Format: double */
            currentScore: number | null;
            gradeStatus: components["schemas"]["NullableOfExamGradeRevisionStatus"];
            isReleased: boolean;
        };
        /** @enum {string|null} */
        NullableOfExamGradeRevisionStatus: "Draft" | "ReadyForRelease" | "Released" | "Superseded" | null;
        TeacherLearnerOverviewDto: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            /** Format: uuid */
            enrollmentId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            learnerDisplayName: string;
            /** Format: int32 */
            eligibleSessionCount: number;
            /** Format: int32 */
            presentCount: number;
            /** Format: int32 */
            absentCount: number;
            /** Format: int32 */
            lateCount: number;
            /** Format: int32 */
            excusedCount: number;
            /** Format: int32 */
            notRecordedCount: number;
            /** Format: int32 */
            assignmentCount: number;
            /** Format: int32 */
            submittedAssignmentCount: number;
            /** Format: int32 */
            releasedAssignmentCount: number;
            /** Format: int32 */
            examCount: number;
            /** Format: int32 */
            finalizedExamAttemptCount: number;
            /** Format: int32 */
            releasedExamCount: number;
        };
        ReportPageOfManagerEnrollmentReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ManagerEnrollmentReportItem"][];
        };
        ManagerEnrollmentReportItem: {
            /** Format: uuid */
            enrollmentId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            learnerDisplayName: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            /** Format: uuid */
            courseId: string;
            courseTitle: string;
            /** Format: uuid */
            academicPeriodId: string;
            academicPeriodTitle: string;
            status: components["schemas"]["EnrollmentStatus"];
            /** Format: date-time */
            enrolledAtUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
        };
        ReportPageOfManagerAttendanceReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ManagerAttendanceReportItem"][];
        };
        ManagerAttendanceReportItem: {
            /** Format: uuid */
            classId: string;
            classTitle: string;
            courseTitle: string;
            /** Format: int32 */
            eligibleRecordCount: number;
            /** Format: int32 */
            recordedCount: number;
            /** Format: int32 */
            presentCount: number;
            /** Format: int32 */
            absentCount: number;
            /** Format: int32 */
            lateCount: number;
            /** Format: int32 */
            excusedCount: number;
            /** Format: int32 */
            notRecordedCount: number;
            /** Format: double */
            recordedAbsencePercentage: number | null;
        };
        ReportPageOfManagerAssessmentReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ManagerAssessmentReportItem"][];
        };
        ManagerAssessmentReportItem: {
            kind: components["schemas"]["DetailedReportAssessmentKind"];
            /** Format: uuid */
            assessmentId: string;
            /** Format: uuid */
            versionId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            courseTitle: string;
            title: string;
            /** Format: date-time */
            deadlineUtc: string;
            /** Format: double */
            maximumScore: number;
            /** Format: int32 */
            recipientCount: number;
            /** Format: int32 */
            submittedOrFinalizedCount: number;
            /** Format: int32 */
            releasedResultCount: number;
            /** Format: int32 */
            pendingGradingCount: number;
        };
        /** @enum {string} */
        DetailedReportAssessmentKind: "Assignment" | "Exam";
        ManagerClassPerformanceDto: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            courseTitle: string;
            /** Format: int32 */
            activeLearnerCount: number;
            /** Format: int32 */
            assignmentReleasedResultCount: number;
            /** Format: double */
            assignmentAveragePercentage: number | null;
            /** Format: int32 */
            examReleasedResultCount: number;
            /** Format: double */
            examAveragePercentage: number | null;
        };
        ReportPageOfManagerTeacherWorkloadReportItem: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            pageNumber: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["ManagerTeacherWorkloadReportItem"][];
        };
        ManagerTeacherWorkloadReportItem: {
            /** Format: uuid */
            teacherMembershipId: string;
            /** Format: uuid */
            teacherUserId: string;
            teacherDisplayName: string;
            /** Format: int32 */
            activeClassCount: number;
            /** Format: int32 */
            completedSessionCount: number;
            /** Format: int32 */
            attendanceMissingCount: number;
            /** Format: int32 */
            assignmentPendingGradingCount: number;
            /** Format: int32 */
            examPendingGradingCount: number;
        };
        SessionResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            classTitle: string;
            /** Format: uuid */
            scheduleRuleId: string | null;
            title: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            timeZoneId: string;
            meetingUrl: string | null;
            status: components["schemas"]["SessionStatus"];
            /** Format: date-time */
            cancelledAtUtc: string | null;
            /** Format: date-time */
            completedAtUtc: string | null;
            rowVersion: string;
        };
        CreateScheduleRuleCommand: {
            localDayOfWeek: components["schemas"]["DayOfWeek"];
            /** Format: time */
            localStartTime: string;
            /** Format: int32 */
            durationMinutes: number;
            timeZoneId: string;
            /** Format: date */
            effectiveFrom: string;
            /** Format: date */
            effectiveUntil: string;
            sessionTitle: string;
            meetingUrl: string | null;
        };
        /** @enum {string} */
        DayOfWeek: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
        ScheduleRuleResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            classId: string;
            localDayOfWeek: components["schemas"]["DayOfWeek"];
            /** Format: time */
            localStartTime: string;
            /** Format: int32 */
            durationMinutes: number;
            timeZoneId: string;
            /** Format: date */
            effectiveFrom: string;
            /** Format: date */
            effectiveUntil: string;
            sessionTitle: string;
            meetingUrl: string | null;
            status: components["schemas"]["ScheduleRuleStatus"];
            /** Format: int32 */
            generatedSessionCount: number;
            rowVersion: string;
        };
        /** @enum {string} */
        ScheduleRuleStatus: "Active" | "Ended";
        UpdateScheduleRuleCommand: {
            localDayOfWeek: components["schemas"]["DayOfWeek"];
            /** Format: time */
            localStartTime: string;
            /** Format: int32 */
            durationMinutes: number;
            timeZoneId: string;
            /** Format: date */
            effectiveFrom: string;
            /** Format: date */
            effectiveUntil: string;
            /** Format: date */
            applyFromDate: string;
            sessionTitle: string;
            meetingUrl: string | null;
            expectedRowVersion: string;
        };
        CreateSchoolGuardianInvitationCommand: {
            /** Format: uuid */
            clientOperationId: string;
            username: string | null;
            phoneNumber: string | null;
            /** Format: date-time */
            expiresAtUtc: string;
            reason: string;
        };
        SchoolGuardianInvitationResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            status: components["schemas"]["InvitationStatus"];
            /** Format: date-time */
            expiresAtUtc: string;
            version: string;
            replayed: boolean;
            nextAction: string;
        };
        CreateSchoolGuardianRelationCommand: {
            /** Format: uuid */
            guardianUserId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            reason: string;
        };
        SchoolGuardianRelationDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            guardianUserId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            status: components["schemas"]["GuardianRelationStatus"];
            /** Format: date-time */
            validFromUtc: string;
            /** Format: date-time */
            endedAtUtc: string | null;
            rowVersion: string;
            /** @default false */
            replayed: boolean;
        };
        SchoolGuardianRelationsPage: {
            /** Format: date-time */
            dataAsOfUtc: string;
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            items: components["schemas"]["SchoolGuardianRelationDto"][];
        };
        CreateSessionCommand: {
            title: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            timeZoneId: string;
            meetingUrl: string | null;
        };
        UpdateSessionCommand: {
            title: string;
            /** Format: date-time */
            startUtc: string;
            /** Format: date-time */
            endUtc: string;
            timeZoneId: string;
            meetingUrl: string | null;
            expectedRowVersion: string;
        };
        SessionVersionCommand: {
            expectedRowVersion: string;
        };
        SessionAttendanceResult: {
            /** Format: uuid */
            sessionId: string;
            sessionStatus: components["schemas"]["SessionStatus"];
            entries: components["schemas"]["AttendanceEntryResult"][];
            revisions: components["schemas"]["AttendanceRevisionResult"][];
        };
        AttendanceEntryResult: {
            /** Format: uuid */
            attendanceId: string | null;
            /** Format: uuid */
            enrollmentId: string;
            /** Format: uuid */
            learnerOrganizationPersonId: string;
            status: components["schemas"]["AttendanceStatus"];
            /** Format: date-time */
            recordedAtUtc: string | null;
            /** Format: uuid */
            recordedByMembershipId: string | null;
            rowVersion: string | null;
        };
        AttendanceRevisionResult: {
            /** Format: uuid */
            id: string;
            previousStatus: components["schemas"]["AttendanceStatus"];
            newStatus: components["schemas"]["AttendanceStatus"];
            /** Format: date-time */
            correctedAtUtc: string;
            /** Format: uuid */
            correctedByMembershipId: string;
            reason: string;
        };
        RecordAttendanceCommand: {
            entries: components["schemas"]["RecordAttendanceEntryCommand"][];
        };
        RecordAttendanceEntryCommand: {
            /** Format: uuid */
            enrollmentId: string;
            status: components["schemas"]["AttendanceStatus"];
        };
        CorrectAttendanceCommand: {
            status: components["schemas"]["AttendanceStatus"];
            correctionReason: string;
            expectedRowVersion: string;
        };
        SubmissionAttemptResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: uuid */
            assignmentRecipientId: string;
            /** Format: uuid */
            enrollmentId: string;
            /** Format: int32 */
            attemptNumber: number;
            status: components["schemas"]["SubmissionAttemptStatus"];
            contentVisible: boolean;
            answerText: string | null;
            attachments: components["schemas"]["SubmissionAttachmentResult"][];
            /** Format: date-time */
            createdAtUtc: string;
            /** Format: date-time */
            lastSavedAtUtc: string | null;
            /** Format: date-time */
            submittedAtUtc: string | null;
            isLate: boolean;
            rowVersion: string;
        };
        /** @enum {string} */
        SubmissionAttemptStatus: "Draft" | "Submitted";
        SaveSubmissionDraftCommand: {
            answerText: string | null;
            expectedRowVersion: string;
        };
        AttachSubmissionFileCommand: {
            /** Format: uuid */
            fileAssetId: string;
            expectedRowVersion: string;
        };
        FinalSubmitAssignmentCommand: {
            expectedRowVersion: string;
        };
        SubmissionReceipt: {
            /** Format: uuid */
            submissionAttemptId: string;
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            assignmentVersionId: string;
            /** Format: int32 */
            attemptNumber: number;
            /** Format: date-time */
            submittedAtUtc: string;
            isLate: boolean;
            status: components["schemas"]["SubmissionAttemptStatus"];
            rowVersion: string;
        };
        WorkspaceResult: {
            workspaceType: components["schemas"]["WorkspaceType"];
            /** Format: uuid */
            organizationId: string | null;
            organizationName: string | null;
            /** Format: uuid */
            membershipId: string | null;
            role: components["schemas"]["NullableOfOrganizationRole"];
            displayName: string;
            status: string;
            membershipStatus?: components["schemas"]["NullableOfMembershipStatus"];
            roleStatus?: components["schemas"]["NullableOfRoleAssignmentStatus"];
            organizationStatus?: components["schemas"]["NullableOfOrganizationStatus"];
            isEffective?: boolean;
            canEnter?: boolean;
            isVisible?: boolean | null;
            hasEffectiveEducationalRole?: boolean;
        };
        /** @enum {string|null} */
        NullableOfMembershipStatus: "Active" | "Suspended" | "Ended" | null;
        /** @enum {string|null} */
        NullableOfRoleAssignmentStatus: "Active" | "Ended" | null;
        /** @enum {string|null} */
        NullableOfOrganizationStatus: "Active" | "Suspended" | null;
        SelectWorkspaceCommand: {
            workspaceType: components["schemas"]["WorkspaceType"];
            /** Format: uuid */
            membershipId: string | null;
            role: components["schemas"]["NullableOfOrganizationRole"];
        };
        WorkspaceSnapshotResult: {
            version: string;
            hasEffectiveEducationalRole: boolean;
            personalWorkspaceVisible: boolean | null;
            personalVisibilityDecision: string;
            workspaces: components["schemas"]["WorkspaceResult"][];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
