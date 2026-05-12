from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .services import AdzunaJobClient
from users.models import Resume 
import logging

logger = logging.getLogger(__name__)

class JobViewSet(viewsets.ViewSet):
    """ViewSet for job searching"""
    permission_classes = [permissions.IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.job_client = AdzunaJobClient()
    
    def list(self, request):
        return self.search(request)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for jobs - calculates match score based on user's resume"""
        try:
            what = request.query_params.get('q', '')
            where = request.query_params.get('location', '')
            country = request.query_params.get('country', 'us')
            page = request.query_params.get('page', 1)
            days_old = request.query_params.get('days_old', '30')
            
            if not what:
                return Response(
                    {'error': 'Search query (q) is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            params = {
                'what': what,
                'where': where,
                'country': country,
                'page': page,
                'days_old': days_old,
            }
            
            job_type = request.query_params.get('job_type', '')
            if job_type == 'full-time':
                params['full_time'] = '1'
            elif job_type == 'part-time':
                params['part_time'] = '1'
            elif job_type == 'contract':
                params['contract'] = '1'
            elif job_type == 'permanent':
                params['permanent'] = '1'
            
            results = self.job_client.search_jobs(params)
            
            if not results or not results.get('results'):
                return Response({'count': 0, 'results': []})
            
            # Get user's primary resume with parsed content
            user = request.user
            primary_resume = Resume.objects.filter(user=user, is_primary=True).first()
            
            # Extract resume skills if available
            resume_skills = []
            if primary_resume and primary_resume.parsed_content:
                parsed = primary_resume.parsed_content
                if 'keywords' in parsed and 'matched' in parsed['keywords']:
                    resume_skills = [
                        s.lower().strip()
                        for s in parsed['keywords']['matched']
                        if s and len(s.strip()) > 2 and "missing" not in s.lower()
        ]
                elif 'skills' in parsed:
                    resume_skills = [s.lower() for s in parsed['skills']]
                elif 'strengths' in parsed:
                    skill_keywords = ['python', 'javascript', 'react', 'django', 'aws', 'docker', 
                                     'kubernetes', 'sql', 'mongodb', 'typescript', 'node', 'java', 'c++']
                    for strength in parsed['strengths']:
                        for keyword in skill_keywords:
                            if keyword.lower() in strength.lower():
                                resume_skills.append(keyword)
                    resume_skills = list(set(resume_skills))
            
            logger.info(f"Resume skills extracted: {resume_skills}")
            
            # Transform jobs and calculate match scores
            jobs = []
            for job in results.get('results', []):
                salary_min = job.get('salary_min')
                salary_max = job.get('salary_max')
                salary_str = self._format_salary(salary_min, salary_max)
                job_type_val = self._determine_job_type(job)
                skills = self._extract_skills(job)
                
                # Calculate match score based on resume skills
                match_score = 0
                matched_skills = []
                
                if resume_skills and skills:
                    job_skills_lower = [s.lower() for s in skills]
                    for skill in resume_skills:
                        for job_skill in job_skills_lower:
                            if skill in job_skill or job_skill in skill:
                                matched_skills.append(job_skill)
                                break
                    
                    matched_skills = list(set(matched_skills))
                    match_score = int((len(matched_skills) / len(job_skills_lower)) * 100) if job_skills_lower else 0
                
                jobs.append({
                    'id': job.get('id'),
                    'title': job.get('title'),
                    'company': job.get('company', {}).get('display_name'),
                    'location': job.get('location', {}).get('display_name'),
                    'salary': salary_str,
                    'salary_min': salary_min,
                    'salary_max': salary_max,
                    'type': job_type_val,
                    'description': job.get('description'),
                    'requirements': [],
                    'responsibilities': [],
                    'benefits': [],
                    'posted': job.get('created'),
                    'deadline': job.get('expiration_date'),
                    'applicants': job.get('applications', 0),
                    'logo': None,
                    'match_score': match_score,
                    'matched_skills': matched_skills,
                    'skills': skills,
                    'redirect_url': job.get('redirect_url'),
                })
            
            # Sort jobs by match score (highest first)
            jobs.sort(key=lambda x: x['match_score'], reverse=True)
            
            return Response({
                'count': results.get('count', 0),
                'results': jobs
            })
            
        except Exception as e:
            logger.error(f"Job search error: {str(e)}")
            return Response(
                {'error': f'Failed to search jobs: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _format_salary(self, min_salary, max_salary):
        if min_salary and max_salary:
            return f"${min_salary:,.0f} - ${max_salary:,.0f}"
        elif min_salary:
            return f"From ${min_salary:,.0f}"
        elif max_salary:
            return f"Up to ${max_salary:,.0f}"
        return "Not specified"
    
    def _determine_job_type(self, job):
        if job.get('contract_time') == 'full_time':
            return 'full-time'
        elif job.get('contract_time') == 'part_time':
            return 'part-time'
        elif job.get('contract_type') == 'permanent':
            return 'permanent'
        elif job.get('contract_type') == 'contract':
            return 'contract'
        return 'full-time'
    
    def _extract_skills(self, job):
        common_skills = [
            'python', 'javascript', 'react', 'node.js', 'java', 'c++', 'c#',
            'aws', 'azure', 'docker', 'kubernetes', 'sql', 'mongodb', 'postgresql',
            'typescript', 'html', 'css', 'git', 'devops', 'machine learning',
            'data science', 'analytics', 'project management', 'agile', 'scrum',
            'django', 'flask', 'spring', 'tensorflow', 'pytorch', 'pandas',
            'numpy', 'scikit-learn', 'tableau', 'power bi', 'excel', 'salesforce'
        ]
        
        text = f"{job.get('title', '')} {job.get('description', '')}".lower()
        found_skills = []
        
        for skill in common_skills:
            if skill in text:
                found_skills.append(skill.title())
        
        return found_skills[:10]