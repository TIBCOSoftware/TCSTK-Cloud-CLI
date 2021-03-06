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
import { AnalysisMetadata } from './analysisMetadata';
import { AnalysisData } from './analysisData';


export interface Analysis { 
    /**
     * Analysis ID
     */
    id?: string;
    data: AnalysisData;
    metadata: AnalysisMetadata;
    actions: Array<string>;
}

