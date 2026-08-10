import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { extractYear, BoldText } from './utils';

// Classic résumé: black on white
const INK = "#000000";

// Base template component that accepts styling configuration
export const createResumeTemplate = (config) => {
    const {
        fonts = {},
        sectionTitles = {},
        headerLayout = 'center', // 'center' or 'split'
    } = config;

    const styles = StyleSheet.create({
        page: {
            padding: "15mm",
            fontSize: fonts.baseSize || 11,
            fontFamily: fonts.body || "Times-Roman",
            color: INK,
        },
        header: {
            textAlign: headerLayout === "center" ? "center" : "left",
            marginBottom: 12,
            paddingBottom: 4,
        },
        headerContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        headerLeft: {},
        headerContactCol: {
            alignItems: "flex-end",
        },
        name: {
            fontSize: fonts.nameSize || 22,
            fontFamily: fonts.title || "Times-Bold",
            fontWeight: "bold",
            marginBottom: 4,
            color: INK,
            textTransform: "none",
        },
        title: {
            fontSize: fonts.titleSize || 11,
            fontFamily: fonts.body || "Times-Roman",
            fontStyle: "italic",
            fontWeight: "normal",
            marginBottom: 6,
            color: INK,
        },
        contact: {
            fontSize: fonts.contactSize || 10,
            fontFamily: fonts.body || "Times-Roman",
            color: INK,
            lineHeight: 1.45,
            textAlign: headerLayout === "split" ? "right" : "center",
        },
        contactSecond: {
            fontSize: fonts.contactSize || 10,
            fontFamily: fonts.body || "Times-Roman",
            color: INK,
            lineHeight: 1.45,
            marginTop: 2,
            textAlign: headerLayout === "split" ? "right" : "center",
        },
        contactItem: {
            marginBottom: headerLayout === "split" ? 3 : 0,
        },
        section: {
            marginBottom: 11,
        },
        sectionTitle: {
            fontSize: fonts.sectionSize || 10.5,
            fontFamily: fonts.title || "Times-Bold",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 0.3,
            color: INK,
            marginBottom: 6,
            paddingBottom: 3,
            borderBottomWidth: 1,
            borderBottomColor: INK,
        },
        summary: {
            fontSize: fonts.summarySize || 11,
            fontFamily: fonts.body || "Times-Roman",
            lineHeight: 1.55,
            textAlign: "left",
            color: INK,
        },
        skillsRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 5,
            width: "100%",
        },
        skillsPrefix: {
            flexDirection: "row",
            flexShrink: 0,
            maxWidth: "38%",
        },
        skillsBullet: {
            fontSize: fonts.skillsLabelSize || 10,
            fontFamily: fonts.body || "Times-Roman",
            color: INK,
            marginRight: 4,
        },
        skillsCat: {
            fontSize: fonts.skillsLabelSize || 10,
            fontFamily: fonts.title || "Times-Bold",
            fontWeight: "bold",
            color: INK,
        },
        skillsBody: {
            fontSize: fonts.skillsListSize || 10,
            fontFamily: fonts.body || "Times-Roman",
            lineHeight: 1.5,
            color: INK,
            flex: 1,
        },
        expItem: {
            marginBottom: 12,
        },
        expHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 2,
        },
        expTitle: {
            fontSize: fonts.expTitleSize || 11,
            fontFamily: fonts.title || "Times-Bold",
            fontWeight: "bold",
            color: INK,
            flex: 1,
            paddingRight: 8,
        },
        expDates: {
            fontSize: fonts.expDatesSize || 10,
            fontFamily: fonts.title || "Times-Bold",
            fontWeight: "bold",
            color: INK,
            flexShrink: 0,
        },
        expCompany: {
            fontSize: fonts.expCompanySize || 10,
            fontFamily: fonts.body || "Times-Roman",
            color: INK,
            marginBottom: 4,
            fontStyle: "italic",
        },
        expDetails: {
            marginLeft: 18,
        },
        expDetailItem: {
            fontSize: fonts.expDetailSize || 10,
            fontFamily: fonts.body || "Times-Roman",
            lineHeight: 1.5,
            marginBottom: 3,
            color: INK,
        },
        eduItem: {
            marginBottom: 10,
        },
        eduHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 2,
        },
        eduDegree: {
            fontSize: fonts.eduDegreeSize || 11,
            fontFamily: fonts.title || "Times-Bold",
            fontWeight: "bold",
            color: INK,
            flex: 1,
            paddingRight: 8,
        },
        eduDates: {
            fontSize: fonts.eduDatesSize || 10,
            fontFamily: fonts.title || "Times-Bold",
            fontWeight: "bold",
            color: INK,
            flexShrink: 0,
        },
        eduSchool: {
            fontSize: fonts.eduSchoolSize || 10,
            fontFamily: fonts.body || "Times-Roman",
            color: INK,
            fontStyle: "italic",
        },
    });

    const TemplateComponent = ({ data }) => {
        const {
            name,
            title,
            email,
            phone,
            location,
            linkedin,
            website,
            summary,
            skills,
            experience,
            education,
        } = data;

        const contactPrimary = [email, phone, location]
            .filter(Boolean)
            .join(" • ");
        const contactLinks = [linkedin, website].filter(Boolean).join(" • ");

        const renderHeader = () => {
            if (headerLayout === "split") {
                return (
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.name}>{name}</Text>
                                {title && <Text style={styles.title}>{title}</Text>}
                            </View>
                            <View style={styles.headerContactCol}>
                                {contactPrimary ? (
                                    <Text style={styles.contact}>{contactPrimary}</Text>
                                ) : null}
                                {contactLinks ? (
                                    <Text style={styles.contactSecond}>{contactLinks}</Text>
                                ) : null}
                            </View>
                        </View>
                    </View>
                );
            }

            return (
                <View style={styles.header}>
                    <Text style={styles.name}>{name}</Text>
                    {title && <Text style={styles.title}>{title}</Text>}
                    {contactPrimary ? (
                        <Text style={styles.contact}>{contactPrimary}</Text>
                    ) : null}
                    {contactLinks ? (
                        <Text style={styles.contactSecond}>{contactLinks}</Text>
                    ) : null}
                </View>
            );
        };

        return (
            <Document>
                <Page size="A4" style={styles.page}>
                    {renderHeader()}

                    {summary && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{sectionTitles.summary || 'Summary'}</Text>
                            <BoldText text={summary} style={styles.summary} />
                        </View>
                    )}

                    {skills && Object.keys(skills).length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {sectionTitles.skills || "SKILLS"}
                            </Text>
                            {Object.entries(skills).map(([category, skillList], idx) => {
                                const joined = Array.isArray(skillList)
                                    ? skillList.join(", ")
                                    : String(skillList);
                                return (
                                    <View key={idx} style={styles.skillsRow} wrap={false}>
                                        <View style={styles.skillsPrefix}>
                                            <Text style={styles.skillsBullet}>•</Text>
                                            <Text style={styles.skillsCat}>{category}: </Text>
                                        </View>
                                        <BoldText text={joined} style={styles.skillsBody} />
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {experience && experience.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{sectionTitles.experience || 'Experience'}</Text>
                            {experience.map((exp, idx) => (
                                <View key={idx} style={styles.expItem}>
                                    <View style={styles.expHeader}>
                                        <Text style={styles.expTitle}>{exp.title || 'Engineer'}</Text>
                                        <Text style={styles.expDates}>
                                            {exp.start_date} – {exp.end_date}
                                        </Text>
                                    </View>
                                    <Text style={styles.expCompany}>
                                        {exp.company}
                                        {exp.location && `, ${exp.location}`}
                                    </Text>
                                    {exp.details && exp.details.length > 0 && (
                                        <View style={styles.expDetails}>
                                            {exp.details.map((detail, detailIdx) => (
                                                <View key={detailIdx} style={{ marginBottom: 2 }}>
                                                    <BoldText text={`•  ${detail}`} style={styles.expDetailItem} />
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {education && education.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{sectionTitles.education || 'Education'}</Text>
                            {education.map((edu, idx) => (
                                <View key={idx} style={styles.eduItem}>
                                    <View style={styles.eduHeader}>
                                        <Text style={styles.eduDegree}>{edu.degree}</Text>
                                        <Text style={styles.eduDates}>
                                            {extractYear(edu.start_year)}
                                            {edu.end_year && ` – ${extractYear(edu.end_year)}`}
                                        </Text>
                                    </View>
                                    <Text style={styles.eduSchool}>
                                        {edu.school}
                                        {edu.grade && ` • GPA: ${edu.grade}`}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Page>
            </Document>
        );
    };

    return TemplateComponent;
};

