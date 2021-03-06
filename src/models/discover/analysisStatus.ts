/**
 * TIBCO Discover public API
 * TIBCO Discover public API
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


export interface AnalysisStatus { 
    /**
     * TBD
     */
    organisation?: string;
    /**
     * TBD
     */
    jobName?: string;
    /**
     * TBD
     */
    analysisId?: string;
    /**
     * TBD
     */
    message?: string;
    /**
     * TBD
     */
    level?: AnalysisStatus.LevelEnum;
    /**
     * TBD
     */
    progression?: number;
    /**
     * TBD
     */
    timestamp?: string;
}
export namespace AnalysisStatus {
    export type LevelEnum = 'ERROR' | 'INFO';
    export const LevelEnum = {
        Error: 'ERROR' as LevelEnum,
        Info: 'INFO' as LevelEnum
    };
}


