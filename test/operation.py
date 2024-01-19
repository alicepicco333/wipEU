
#Attitudinal discrimination against women engaging in paid work outside the home by sex: 2016 (Percentage)
import pandas as pd
df1_discrimination = pd.read_csv("data/Discriminatory_attitudes_towards_women_in_paid_employment/download.csv")
df2_discrimination = pd.read_csv("data/Discriminatory_attitudes_towards_women_in_paid_employment/download (1).csv").fillna("")
df1_earnings = pd.read_csv("data/Earnings_of_married_women_and_men_in_employment_by_type_of_remuneration/download.csv")
df2_earnings = pd.read_csv("data/Earnings_of_married_women_and_men_in_employment_by_type_of_remuneration/download (1).csv")
df1_equal_rights = pd.read_csv("data/equal_rights_of_women_to_the_ownership_and_control_of_land_fao/download.csv")
df2_equal_rights = pd.read_csv("data/equal_rights_of_women_to_the_ownership_and_control_of_land_fao/download (1).csv")
df3_equal_rights = pd.read_csv("data/equal_rights_of_women_to_the_ownership_and_control_of_land_fao/download (2).csv")
df4_equal_rights = pd.read_csv("data/equal_rights_of_women_to_the_ownership_and_control_of_land_fao/download (3).csv")
df1_females_stem = pd.read_csv("data/female_graduates_in_science_technology_engineering_and_mathematics_at_the_tertiary_level_of_education/download.csv")
df2_females_stem = pd.read_csv("data/female_graduates_in_science_technology_engineering_and_mathematics_at_the_tertiary_level_of_education/download (1).csv")
df1_unpaid_work = pd.read_csv("data/time_spent_in_unpaid_work_total_work_burden_and_work_life_balance/download.csv")
df2_unpaid_work = pd.read_csv("data/time_spent_in_unpaid_work_total_work_burden_and_work_life_balance/download (1).csv")
df3_unpaid_work = pd.read_csv("data/time_spent_in_unpaid_work_total_work_burden_and_work_life_balance/download (2).csv")
df1_women_decision_makers = pd.read_csv("data/women_as_decision_makers_in_the_corporate_world/download.csv")
df2_women_decision_makers = pd.read_csv("data/women_as_decision_makers_in_the_corporate_world/download (1).csv")
df3_women_decision_makers = pd.read_csv("data/women_as_decision_makers_in_the_corporate_world/download (2).csv")
df4_women_decision_makers = pd.read_csv("data/women_as_decision_makers_in_the_corporate_world/download (3).csv")
df5_women_decision_makers = pd.read_csv("data/women_as_decision_makers_in_the_corporate_world/download (4).csv")
df6_women_decision_makers = pd.read_csv("data/women_as_decision_makers_in_the_corporate_world/download (5).csv")
df1_un_women = pd.read_csv("data/women_in_local_government_un_women/download.csv")
df2_un_women = pd.read_csv("data/women_in_local_government_un_women/download (1).csv")
df1_women_police = pd.read_csv("data/women_in_the_police/download.csv")
df2_women_police = pd.read_csv("data/women_in_the_police/download (1).csv")


# print(df1_equal_rights)
# print(df2_equal_rights)
# print(df3_equal_rights)
# print(df4_equal_rights)
# df2_un_women['Region'] = df2_un_women['Region'].fillna(method='ffill')
print(df1_un_women)
print(df2_un_women)


# print("Valori univoci in df1:", df1_discrimination["SDG region"].unique())
# print("Valori univoci in df2:", df2_discrimination["SDG region"].unique())

#media per ogni SDG region
# def mean_sdg_region(df):
#     df = df
# mean_per_sdg_region = df1_discrimination.groupby('SDG region')[['% Men', '% Women']].mean().reset_index()
# print(mean_per_sdg_region)
# df2_earnings.rename(columns={'Sex': 'SDG region'}, inplace=True)

# mean_per_sdg_region2 = df2_earnings.groupby('SDG region')[['Any cash labor income', 'Cash only']].mean().reset_index()
# print(mean_per_sdg_region2)

# df1 = pd.DataFrame(df1_discrimination)
# df2 = pd.DataFrame(df2_earnings)

# # Unione dei DataFrame
# df = pd.merge(df1, df2, on='SDG region')

# # Calcolo della correlazione
# correlation = df.corr()

# print(correlation)
